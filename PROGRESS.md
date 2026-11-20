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
    gates, 14 panels per Trường Tiền span. The rampart boxes in `city.js` still cross the gate mouths, so those
    passages end in a 1.2 m porch and a dark panel.
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
