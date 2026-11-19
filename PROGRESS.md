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
- Frame cost after all of this: ~18 ms at 2190×1369 (unchanged from before the extension), ~11–14 ms at 1280×800.

## Not verified
- The southern models were checked from the air only; causeway landing, the dragon's heading, Nam Giao's exact
  alignment and the Đồng Khánh tomb's orientation are inferred, not surveyed.
- Street life was checked in still frames (stepped), not watched in real time.
- Real touch gestures on a physical phone (layout and logic checked in a 375×812 viewport only).
- Frame rate on low-end phones (adaptive resolution is in place but untested on hardware).

## Next (ideas)
- Lăng Gia Long lies 3 km beyond the southern edge.
