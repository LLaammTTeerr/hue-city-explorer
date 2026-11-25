# Huế City Explorer — Architecture & Navigation Guide

A human-friendly map of the codebase so you can find any feature, landmark, shader, or check in seconds.

---

## High-Level Directory Map

```text
hue_city_explorer/
├── src/                        # Browser app (Three.js + Vite, zero runtime backend)
│   ├── main.js                 # App bootstrap, WebGL renderer, tile streaming & frame loop
│   ├── config.js               # Global constants (LAND_Y, road widths, palettes, mood presets)
│   ├── camera/
│   │   └── controls.js         # OrbitControls, smooth flyTo(), keyboard & touch navigation
│   ├── env/                    # Atmosphere, lighting, water & post-processing
│   │   ├── sky.js              # Procedural sky dome & clouds
│   │   ├── water.js            # Perfume River planar reflection, flow current & wavelets
│   │   ├── mood.js             # Time-of-day (morning/afternoon/night) & rain transitions
│   │   ├── csm.js              # Cascaded directional shadow maps
│   │   ├── ibl.js              # Procedural sky environment map (IBL)
│   │   ├── rain.js             # Falling rain particles
│   │   └── post.js             # 12-tap SSAO, color grading, tilt-shift DOF & ink-look pass
│   ├── geo/                    # Core 3D geometry & material engine
│   │   ├── buf.js              # Static triangle-soup builder (Buf), KIND constants & roof joining
│   │   ├── materials.js        # PBR material factories (cityMaterial, landMaterial, foliageDepth)
│   │   ├── shaders/
│   │   │   ├── city-surface.js # Procedural GLSL (facades, roof tiles, masonry, grass, hero sheen)
│   │   │   └── lights.js       # Additive night-lighting strips & distance-clamped lamp halos
│   │   ├── city.js             # Land slab, roads, junctions, OSM buildings, infill houses & trees
│   │   ├── terrain.js          # Elevation raster lookup (rise, groundY, waterY, pondY)
│   │   ├── bridges.js          # Bridge deck elevation profiles & lamp helpers
│   │   ├── foliage.js          # Instanced trees & crowns (broadleaf, palm, pine, phượng, bằng lăng)
│   │   ├── hero-gltf.js        # Lazy-loading GLTF loader + LRU eviction for 83 hero .glb models
│   │   └── hero-manifest.js    # World positions, rotations & load radii for all 83 hero GLBs
│   ├── landmarks/              # Hand-crafted architectural models & living city elements
│   │   ├── build.js            # Single ordered build sequence shared by browser & CI checks
│   │   ├── places/             # 83 per-place replica models (one file per landmark, auto-loaded)
│   │   │   └── index.js        # Auto-discovery contract (id, build, ownsMapped, clearings, etc.)
│   │   ├── life.js             # Barrel re-exporting living-city modules below
│   │   ├── life/
│   │   │   ├── paths.js        # Shared deterministic PRNG & polyline-following utilities
│   │   │   ├── lotus.js        # Lotus pads & blossoms in Citadel moats and ponds
│   │   │   ├── traffic.js      # Animated cars & motorbikes along city roads
│   │   │   └── street-life.js  # Street lamp posts, animated pedestrians & railway train
│   │   ├── citadel.js          # Shared pavilion() helper + Citadel ramparts/moats/generic halls
│   │   ├── tombs.js            # Shared royal-tomb architectural kit (used by places/minhmang.js)
│   │   ├── civic.js            # Remaining Imperial City temple enclosure walls
│   │   ├── truongtien.js       # Cầu Trường Tiền 6-span steel truss bridge
│   │   ├── thuytien.js         # Hồ Thủy Tiên coiled concrete dragon & waterpark
│   │   ├── boats.js            # Perfume River dragon boats, sampans & drifting river lanterns
│   │   ├── props.js            # Reusable statues (mandarins, horses, elephants, cannons, vạc, đỉnh)
│   │   └── enclosure.js        # Fences, courtyards, street/building clearance tests
│   └── ui/                     # Minimal HUD, search, place cards, 2D fallback & share links
│       ├── ui.js               # Main HUD & toolbar controls
│       ├── content.js          # Curated camera VIEWS & guided tour presets
│       ├── search.js           # Bilingual search & category filters
│       ├── labels.js           # 3D-projected landmark pins & collision layout
│       ├── share.js            # URL hash camera & mood state sharing
│       └── fallback.js         # 2D map fallback when WebGL is unavailable
│
├── scripts/                    # Offline data pipeline, hero builders, checks & screenshot tools
│   ├── build-data.mjs          # Compiles raw OSM + DEM + height data → public/data/hue.json & tiles
│   ├── build-hero-glb.mjs      # Exports all 83 sculptural hero .glb assets → public/data/models/
│   ├── build-label-tops.mjs    # Recomputes 3D model top heights → public/data/places.json
│   ├── shot.mjs                # Headless Chrome screenshot tool (per-place or named view)
│   ├── compare.mjs             # Before/after visual diff against origin/main
│   ├── checks/                 # All 14 CI geometry, data, hero, roof, tree & boat checks
│   ├── fetch/                  # Raw OSM, DEM, LiDAR & GIS data downloaders
│   ├── heroes/                 # Modular hero .glb builders (primitives, imperial, tombs-sacred, civic-bridges)
│   ├── lib/                    # Shared headless scene builder (scene.mjs, data.mjs, label-tops.mjs)
│   └── fixtures/               # Regression test fixtures
│
├── public/data/                # Generated runtime data (never hand-edit; rebuild via scripts/)
│   ├── hue.json                # Core city geometry, terrain, roads & first-frame trees
│   ├── places.json             # Lightweight 83-place index for instant search & cards
│   ├── stories.json            # Hand-written bilingual stories for place cards
│   ├── tiles/                  # Streamed infill house & tree tiles
│   └── models/                 # 83 compressed self-hosted hero .glb models
│
└── docs/                       # Research notes per landmark, height references & dev guides
```

---

## Common Developer Tasks

| Goal | Where to look | Command to verify |
| --- | --- | --- |
| Add or edit a landmark | `src/landmarks/places/<slug>.js` | `npm run check && npm run build` |
| Edit a landmark's sculptural `.glb` crest | `scripts/heroes/*.mjs` + `src/geo/hero-manifest.js` | `node scripts/build-hero-glb.mjs && npm run check:heroes` |
| Tune shaders, weathering, or glass | `src/geo/shaders/city-surface.js` & `src/geo/materials.js` | `npm run build && node scripts/shot.mjs <id>` |
| Tune lighting, SSAO, or water | `src/config.js`, `src/env/post.js`, `src/env/water.js` | `npm run build && node scripts/shot.mjs --view truong-tien-river-level` |
| Edit animated traffic, pedestrians, or lotus | `src/landmarks/life/{traffic,street-life,lotus}.js` | `npm run check && npm run build` |
| Update label pin heights after changing a roof | `scripts/build-label-tops.mjs` | `node scripts/build-label-tops.mjs && npm run check:labels` |
