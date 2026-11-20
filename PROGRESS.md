# Progress

## Done
- OSM extract fetched and processed into `public/data/hue.json` (scripts/).
- 3D scene: land cut around real water, roads, rail, 5,159 OSM buildings, illustrated infill and trees.
- Hand-modelled landmarks on OSM footprints: cầu Trường Tiền, Citadel wall and gates, Kỳ Đài, Ngọ Môn,
  Điện Thái Hòa, Phu Văn Lâu, chợ Đông Ba hall and bell tower, dragon boats.
- Atmosphere: afternoon / shower / lights-on moods, planar water reflection (desktop), rain.
- Interaction: map controls, boat ride under the bridge, place list and cards, labels toggle, compass home.
- UI in Vietnamese and English; phone layout.
- Checked in the browser: opening view, ride start to finish and early exit, rain, night, recovery from
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
  balconies; lotus on the still water; motorbikes and cars on main streets; click a dragon boat to travel with it.
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
- Era switcher (branch `era-switcher`): three moments — about 1885 (triều Nguyễn), about 1935 (Pháp thuộc), today
  (`src/era.js`). Every face carries the eras it exists in (`span()` / `aSpan` in `src/geo/buf.js`, clipped in the
  vertex shader and in the shadow pass); `src/geo/eras.js` decides by district when each plot was first built on, and
  earlier eras show the timber, thatched or small colonial house that stood there. Roads, bridges, the railway,
  landmarks, lights, the Kỳ Đài flag, street life (`life.js`), labels and the place list all follow. Control: `#era`
  at the top; the canvas takes a light sepia wash in the older eras.
- Bia Quốc Học (`src/landmarks/memorial.js`): the 1920 memorial screen opposite the school gate; the gate is now
  placed square to it. Dimensions are estimated (no source gives them).
- Ground levels: lakes in the hills stand at their own height (55 of 171, read from the elevation model), with the
  ground held flat at that level in the lake, on its islands and along its shore (`pondLv` in the data, `pondY` /
  `waterY` in `src/geo/terrain.js`).
- Explorer panel: the note card shows picture with credit, dates, summary, a line for the selected era, story,
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
- Frame cost after all of this: ~18 ms at 2190×1369 (unchanged from before the extension), ~11–14 ms at 1280×800.

## Not verified
- The southern models were checked from the air only; causeway landing, the dragon's heading, Nam Giao's exact
  alignment and the Đồng Khánh tomb's orientation are inferred, not surveyed.
- Street life was checked in still frames (stepped), not watched in real time.
- Real touch gestures on a physical phone (layout and logic checked in a 375×812 viewport only).
- Frame rate on low-end phones (adaptive resolution is in place but untested on hardware).

## Next (ideas)
- Lăng Gia Long lies 3 km beyond the southern edge.
