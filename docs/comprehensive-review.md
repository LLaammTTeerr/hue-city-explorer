# Comprehensive System-Wide Review (Non-Model Subsystems)

- **Reviewed revision**: `origin/main` (`30f1b3f`, 2026-11-23)
- **Scope**: All non-model subsystems — Geometry/Terrain/Roads/Bridges/Foliage/LOD (`src/geo/`), Rendering/Shaders/Post-Processing/Water/Shadows/Atmosphere (`src/env/`, `src/geo/materials.js`), UI/Camera/Controls/Search/Labels/Share/Fallback/Mobile/Content (`src/camera/`, `src/ui/`, `public/data/stories.json`), Dynamic World (`src/landmarks/life.js`, `boats.js`, `floating.js`), and the Automated Check Suite (`scripts/check-*.mjs`), plus **live browser QA** on desktop (`1400×900`) and mobile (`390×844`) across both looks (`ink` & `real`), all moods (`afternoon`, `night`, `rain`), hill navigation, and `?nogl` fallback.
- **Companion report**: See [`docs/model-audit.md`](model-audit.md) for the per-model visual audit and 0–10 grades of all 83 landmarks.

## Executive Summary

While `npm run check` passes all 13/13 checks, this review identified **66 concrete bugs and defects** across the codebase and live runtime (**4 Critical, 22 High, 27 Medium, 13 Low**):

- **4 Critical bugs**:
  1. **Camera target locked to `LAND_Y` (`2.6 m`) on 20–101 m hills** — breaks orbiting, zooming, picking, double-click, and near-plane clipping on Ngự Bình, Thiên An, Vọng Cảnh, Nam Giao, and Khải Định.
  2. **Non-WebGL load failure → Browse 2D → Retry 3D traps the user on an infinite 0% loading screen** (`fallback.js`).
  3. **`check-overlap.mjs` stores `min(up)` instead of `max(up)`** — any landmark sitting on a low plinth (`0.15–0.7 m`, e.g., Duyệt Thị Đường) erases the entire building above it from overlap checks.
  4. **`check-overlap.mjs` & `check-burial.mjs` skip `S.noCover` (`kinhthanh`)** — completely blind to models and trees clipping into the Citadel rampart (`quantuong`, `Cửa Kẻ Trài`).
- **Top Live-QA visual/UX defects**:
  - **Blinding white wet-sheen bloom blowout in `?look=real` rain** across wet riverbank parks/roads (`materials.js` + `UnrealBloomPass`).
  - **Mobile place card (`390×844`) overlaps the right-hand tool/compass column**, and `#hint` ("Link copied") renders *behind* `#card`.
  - **Night/Rain HUD readability**: `Huế` brand text becomes dark-on-dark at night, and `© OpenStreetMap contributors` washes out in rain; floodlit riverside buildings (`KIND_FLOOD`) blow out into solid white blocks at night.
  - **`Reflector` copies `camera.layers` (layer 1)**, silently defeating the entire water-reflection exclusion optimization and rendering distant city geometry + 8,000 rain streaks into the river mirror.
  - **Vehicles and trains sink under 2-vertex flat bridge decks** (`life.js:chain`), and traffic ignores actual OSM road widths, driving onto sidewalks/medians/buildings.

---

## 1. Critical Findings

### C1. Camera target is clamped to `LAND_Y` (2.6 m) even on 20–101 m hills
- **Subsystem**: Camera & Controls
- **Location**: `src/camera/controls.js:51-56, 65-72, 119-126`, `src/main.js:177-181, 220-227`
- **Bug / Issue**: `clampView()` unconditionally forces `controls.target.y = LAND_Y` (`2.6 m`) and shifts `camera.position.y` by `LAND_Y - t.y`. `pick()` raises `camera.position.y` by `rise(x, z)` yet hardcodes `target.y = LAND_Y`. Verified live on Núi Ngự Bình (`pick('ngubinh', true)` landed with `target = [774.2, 2.6, 2997.7]` — **100 m underground**):
  1. Orbiting a hilltop landmark swings it off-screen around an underground pivot.
  2. Zooming in close to a summit stalls (`floor = LAND_Y + rise + 1.7` blocks descent while `target.y = 2.6`, forcing `distance >= 102 m`).
  3. `groundAt()` intersects a flat plane at `y = LAND_Y`, so clicking/double-clicking a hilltop shoots straight through the mountain to a point hundreds of metres behind it.
  4. `fov` and `near` compute `h = camera.position.y - LAND_Y` instead of height above local terrain, pushing `near` to ~4 m on summits and clipping nearby hilltop geometry.
- **Suggested Fix**: Set `controls.target.y = LAND_Y + rise(cx, cz)` in `clampView()`, `pick()`, and `dblclick`; compute `h` above local terrain for `fov`/`near`; raycast or march against `LAND_Y + rise(x, z)` in `groundAt()`.

### C2. Load failure → "Browse 2D" → "Retry 3D" permanently traps the user on a 0% loader
- **Subsystem**: UI & Fallback
- **Location**: `src/ui/fallback.js:55-69, 94-106, 245-247`
- **Bug / Issue**: When `hue.json` fails to load on a WebGL-capable device, `main().catch()` calls `fallback.fail()`, leaving `resolveRenderer = null`. If the user enters the 2D map (`Browse places`) and then clicks `Retry 3D` on `#flat-bar`, `tryRenderer()` succeeds, hides the 2D map, locks the UI at 0% loader, and calls `if (done) done(r)` — a no-op because `resolveRenderer` is `null`. The app is permanently stuck. The copy also misleadingly blames the user's device for lacking WebGL.
- **Suggested Fix**: Track `mode = 'gl' | 'load'`. In `'load'` mode, have `#flat-bar`'s retry button call `location.reload()` and display network-retry copy instead of WebGL-unavailable copy.

### C3. `check-overlap.mjs` stores `min(up)` instead of `max(up)` — low plinths erase buildings from overlap checks
- **Subsystem**: Automated Check Suite
- **Location**: `scripts/check-overlap.mjs:68, 75, 83, 250-251`
- **Bug / Issue**: While rasterizing upward-facing triangles into `fine`, line 68 keeps the *lowest* upward face (`if (up < f[b]) f[b] = up;`). When any landmark places a low plinth or paving slab (`0.15 m <= up < 0.7 m`, e.g., `duyetthi.js:58` has a `0.6 m` stone platform) beneath a hall, the low slab overwrites the hall's height and drops `f[b]` below `0.7 m`, **erasing the entire building from `tallDeep`** (mapped-building/infill overlap) — and slabs `< 0.3 m` erase it from model-vs-model overlap too.
- **Suggested Fix**: Track `maxUp` (for `raised`/`tallDeep` building coverage) separately from `minUp` (for `road` clearance under arches/overhangs).

### C4. `check-overlap.mjs` & `check-burial.mjs` skip `S.noCover` (`kinhthanh`), hiding Citadel rampart clipping
- **Subsystem**: Automated Check Suite
- **Location**: `scripts/check-overlap.mjs:26, 48`, `scripts/check-burial.mjs:27`, `src/landmarks/places/kinhthanh.js:136`
- **Bug / Issue**: `kinhthanh.js` pushes the entire Citadel rampart (`[n0, S.n]`) into `S.noCover` so gates and trees can sit on the walk. Because `check-overlap.mjs:48` skips all `S.noCover` triangles and `check-burial.mjs` only checks bare terrain `groundY()`, severe rampart clipping (such as `quantuong`'s half-buried brick base and sheer pit, or trees clipping into the rampart at `Cửa Kẻ Trài`) passes CI with zero warnings.
- **Suggested Fix**: Only mark the horizontal grassed rampart walk as `noCover` (keeping brick rampart walls and parapets in cover/overlap), or add a dedicated rampart-solid check for non-gate landmarks and trees.

---

## 2. Live Browser QA Visual & UX Defects (High)

### QA1. Blinding white wet-sheen bloom blowout in `?look=real` rain
- **Location**: `src/geo/materials.js:400-415, 526-537`, `src/env/post.js` (bloom)
- **Bug / Issue**: Verified in live `rain` capture (`?look=real`, afternoon + rain): wet roughness drops low enough on flat riverbank parks and roads that grazing IBL/sun specular spikes far above the `UnrealBloomPass` threshold, blowing out large patches of the right riverbank near Trường Tiền / Đông Ba into pure nuclear white.
- **Suggested Fix**: Clamp minimum wet roughness on ground/grass/park kinds (`>= 0.35`, reserving low roughness for asphalt/stone) and damp specular/IBL intensity during rain (`1 - uWet * 0.5`) so wet sheen stays subtle and never triggers bloom clipping.

### QA2. Floodlit riverside buildings (`KIND_FLOOD`) blow out into solid white blocks at night
- **Location**: `src/geo/materials.js:541-550`
- **Bug / Issue**: Verified in live `night` capture: `totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.64, 0.3) * (hueCone + hueWash) * hueFace * uGlow * 1.35` pushes bright pale/white riverside facades (`diffuseColor ≈ 0.9`) to `~2.35`, blowing them out into flat glowing white lampshades (especially visible on the D-shaped mall near Đông Ba and riverside buildings upstream).
- **Suggested Fix**: Cap `hueCone + hueWash` or lower the multiplier (`1.35 → 0.55–0.7`) and apply soft compression (`x / (1 + x)`) so architectural detail and uplight scallops remain visible without blowing out into bloom.

### QA3. Mobile place card overlaps right-hand `#tools` and `#nav` compass; `#hint` toast renders behind `#card`
- **Location**: `src/ui/style.css:159, 310, 312`
- **Bug / Issue**: Verified at `390×844` mobile viewport:
  1. Opening a place card (`#card`, `z-index: 2`) places it directly over `#tools` (the `i` button) and `#nav` (compass), which bleed visibly through the translucent card right behind the `×` close button.
  2. `#hint` has no `z-index` (`auto`), so "Link copied" and label toggles appear *underneath* `#card` and are completely invisible when triggered from a place card.
- **Suggested Fix**: Set `#hint { z-index: 5; }` (positioned above `#card` when `body.has-card` is active), and on mobile hide or fade `#tools`/`#nav` (or reduce `#card` width/height cleanly) while `body.has-card` is open.

### QA4. Night & Rain HUD text contrast regressions (`Huế` brand word & attribution pill)
- **Location**: `src/ui/style.css:195`, `index.html` (brand text inside `#search`), `body[data-time='2']`
- **Bug / Issue**:
  1. At night (`data-time="2"`), the `Huế` brand title inside the top-left search box renders dark ink on dark lacquer — nearly invisible.
  2. During rain (`04_rain_real.jpg`), the `© OpenStreetMap contributors` attribution pill at bottom-right washes out to near-blank white, and the `Huế` brand text fades into low-contrast beige.
  3. At night, `.compass .north`, `#places button.seen::before`, and `.label-place.seen > i` use `var(--seal)` (`#9e2a2b`) on dark lacquer (`#1b1523`) — ~2.0:1 contrast ratio.
- **Suggested Fix**: Bind `#search` brand text explicitly to `var(--ink)`, use `var(--accent-ink)` for red accents in `body[data-time='2']`, and ensure `#attrib` keeps opaque contrast across all moods.

---

## 3. High-Severity Code & Architecture Findings

### Subsystem A — Geometry, Terrain, Roads, Bridges & Foliage

#### A1. Flat approach roads snapped to hand-modelled bridges are lifted +12 cm above the city floor
- **Location**: `src/geo/city.js:127-150` (`snapEnds`, `ribbon`)
- **Bug / Issue**: `ribbon()` computes `const pts = drape(snapEnds(pts0, ends)); const lift = pts === pts0 ? 0 : 0.12;`. Because `snapEnds()` returns `pts.slice()` (a new array reference) even on flat ground, `pts === pts0` is `false` and `lift` becomes `0.12 m`. Every flat street snapped to a hand-modelled bridge (Nguyễn Hoàng, Phú Xuân, etc.) floats 12 cm above adjacent flat streets, junction holes, and the bridge joint itself.
- **Suggested Fix**: Compare `drape()` output against the post-snap array (`const snapped = snapEnds(pts0, ends); const pts = drape(snapped);`) and compute `lift` per vertex from `rise(p[0], p[1]) > 0 ? 0.12 : 0`.

#### A2. Tapering road bridges (`r.ws`) pass an `Array` as scalar width `w`, emitting `NaN` vertices
- **Location**: `src/geo/city.js:404, 160, 198, 418-433, 454`
- **Bug / Issue**: For roads with per-point widths (`r.ws`), `pavW(r)` returns an `Array`, which is passed into `slab()`, `landingTilt()`, pier `structures.box()`, and `ribbonPoints()` expecting a scalar — silently dropping carriageways (`Array - 0.2 === NaN`) and emitting `NaN` vertices into `structures` whenever `resample()` increases vertex count beyond `w.length`.
- **Suggested Fix**: Use scalar structural deck width `r.w + (r.c <= 2 ? 3.6 : 2.4)` for bridge decks/piers/tilts, or resample `w` via `widthAt()` inside `slab()`.

#### A3. Unguarded `profiles.get(r.flat).bump(s)` crash risk & wrong lamp height over valleys
- **Location**: `src/geo/city.js:471-480`
- **Bug / Issue**: Line 479 dereferences `profiles.get(r.flat).bump(s)` without guarding for `undefined` (`own: true` bridges or `< 4`-coord ways skipped by `bridgeProfiles()`), which would crash `buildCity()`. It also adds `bump(s)` to `LAND_Y + rise(lx, lz)` instead of `P.y(s)`, sinking bridge lamp glows into ravines/valleys under elevated decks.
- **Suggested Fix**: Guard `const P = r.bridge ? profiles.get(r.flat) : null; if (r.bridge && !P) continue;` and set lamp height from `P ? P.y(s) + 7.5 : LAND_Y + rise(lx, lz) + 7.5`.

### Subsystem B — Rendering, Shaders, Post-Processing, Water & Shadows

#### B1. `Reflector` copies `camera.layers` (layer 1), rendering all excluded city geometry & rain into the river mirror
- **Location**: `src/env/water.js:198-211`, `src/main.js:136`, `src/env/rain.js:39`
- **Bug / Issue**: `Reflector.getReflectionCamera(camera)` in `three@0.187.0` clones `camera` including `layers.mask = 3` (layers 0 + 1). All distant buildings, non-riverside trees, boats, traffic, and street life placed on layer 1 to skip reflection are still rendered into the reflection FBO; `rain.mesh` is also on layer 0 and renders upside-down in the river.
- **Suggested Fix**: Force `mesh.getReflectionCamera(args[2]).layers.set(0)` inside `water.js`'s `onBeforeRender` wrapper, and put `rain.mesh.layers.set(1)`.

#### B2. Transparent & additive passes corrupt the `HalfFloatType` alpha channel in illustrated mode
- **Location**: `src/env/post.js:180-198, 308`, `src/env/rain.js:16-38`, `src/geo/materials.js:681-734`
- **Bug / Issue**: `post.js` encodes material IDs in `tDiffuse.a` (`0.0` = foliage, `0.96` = ground, `1.0` = buildings). `rain.js` (`NormalBlending`) drags alpha into the foliage ink band (`0.14..0.3`), drawing dark ink outlines around raindrops; `lightMaterial` and `glowPoints` (`AdditiveBlending` with `a = 1.0` into unclamped `RGBA16F`) add `1.0` to `dstA`, punching ink rings into tree crowns and exposing 25 m terrain triangles under night lamps in illustrated mode.
- **Suggested Fix**: Use `THREE.CustomBlending` with `blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor` on rain, plinth shadow, `lightMaterial`, and `glowPoints` so they preserve destination alpha.

#### B3. World-space wave normals added to screen-space reflection UVs smear river reflections horizontally when facing East/West
- **Location**: `src/env/water.js:138-142`
- **Bug / Issue**: Line 139 computes screen-aligned distortion `dn` (1.7× vertical stretch), then line 141 rotates `dn` back into world XZ and adds it to clip-space `uv.xy`. Facing East/West (along the Perfume River), the 1.7× stretch distorts `uv.x` horizontally instead of `uv.y` vertically, smearing night bridge reflections sideways.
- **Suggested Fix**: Apply `dn` directly in screen space to `uv.xy` instead of rotating back through world `side`/`fwd`.

#### B4. Alternate-frame reflection throttling causes black water flashes on resize/context-restore, 30 Hz judder, and `0×0` FBO when minimized
- **Location**: `src/env/water.js:200-211`
- **Bug / Issue**: `resize()` reallocates and clears the reflection target to black; if `tick++ % 2 === 1` skips the next frame, the river flashes solid black for 1 frame. Orbiting/panning exhibits 30 Hz reflection judder. `resize` also uses raw `quality.pixelRatio` instead of `renderer.getPixelRatio()` (bypassing `fitRatio()`) and lacks `Math.max(2, ...)` clamping.
- **Suggested Fix**: Reset `tick = 0` on `resize()` and `webglcontextrestored`, clamp target dimensions to `>= 2`, and size from `renderer.getPixelRatio()`.

### Subsystem C — UI, Camera, Labels, Share & Fallback

#### C5. Camera flights (`flyTo`) skip terrain clearance and snap on completion
- **Location**: `src/camera/controls.js:92-117`
- **Bug / Issue**: Flights with `arc: false` (`zoomBy`, `dblclick`, `prefers-reduced-motion`) or short hops between hills clip through terrain, then snap upward 1 frame later when `clampView()` resumes.
- **Suggested Fix**: Enforce terrain floor height inside `if (fly)` and run `clampView()` immediately when `fly` completes.

#### C6. Tier 3 & 4 place labels are invisible in their own framed views (hills, all 13 t=4 places, portrait phones)
- **Location**: `src/ui/labels.js:10, 78-81`, `src/main.js:176-181`
- **Bug / Issue**: `labels.js` compares `camera.position.y - LAND_Y` against `TIER_CEIL = { 3: 210, 4: 160 }`. Because `pick()` places the camera at `y = LAND_Y + rise + off[1] * k` (`k = 1.2` desktop, `1.62` phone), **all 13 Tier-4 places** and **all hilltop Tier-3 places** (and flat Tier-3 places on phones) land above `TIER_CEIL` and hide their own label.
- **Suggested Fix**: Measure camera height above each label's local ground (`camera.position.y - (LAND_Y + rise(it.pos.x, it.pos.z))`) and exempt the currently selected place (`currentId`) from `TIER_CEIL`.

#### C7. Share URL clipboard-failure fallback shows an unselectable, truncated URL; share buttons do nothing in 2D fallback mode
- **Location**: `src/ui/share.js:73-74`, `src/ui/style.css:159, 259`, `src/main.js:72-73, 78`
- **Bug / Issue**: Clipboard fallback calls `ui.hint(url, 9000)` on a `pointer-events: none; text-overflow: ellipsis` toast — impossible to read or copy. In `?nogl` 2D mode (`body.flat`), `#btn-share` and `#card-share` remain visible but do nothing (`sharing` is undefined), while `#nav` zoom/home buttons are hidden despite having wired 2D handlers.
- **Suggested Fix**: Use a selectable `<input readonly>` (or `window.prompt`) on clipboard failure; hide `#btn-share`/`#card-share` in `body.flat` and expose `#nav` zoom/home in 2D mode.

#### C8. `fillMedia()` hides all photos on a single broken image, has a race condition on fast switches, and leaves empty placeholder boxes
- **Location**: `src/ui/ui.js:102-124`
- **Bug / Issue**: Verified live on `ngubinh` (large blank grey rectangle at top of card). A single 404/429 hides the whole `#card-media` even when other photos exist, and a stale `onerror` from Place A can hide Place B's valid photo after a fast switch.
- **Suggested Fix**: Guard with a `mediaGen` counter, hide/collapse `#card-media` until `onload` succeeds (or try the next photo in `imgs` on `onerror`), and clear `src` on place change.

#### C9. Label panel-avoidance (`blocked`) only refreshes every 30 frames
- **Location**: `src/ui/labels.js:61-68`
- **Bug / Issue**: Opening a card or search dropdown leaves 3D labels colliding with UI panels for up to 1 second (29 steps in `?still` mode).
- **Suggested Fix**: Expose `invalidateLayout()` and invoke it immediately when `#card` or `#panel` opens/closes.

#### C10. Share URL `apply()` hill projection, rounding bounds, and mobile tilt bugs
- **Location**: `src/ui/share.js:16, 27-30, 99, 124-134`
- **Bug / Issue**: `r1()` rounding can push a target outside `bounds` so `parseShare()` rejects its own generated URL; line 99 projects `v.place` at `LAND_Y` instead of hill height; mobile tilt pushes `controls.target` without clamping to `bounds`.
- **Suggested Fix**: Add `0.15 m` tolerance in `parseShare()`, use `LAND_Y + rise(...)` on line 99, and clamp tilted mobile targets to `bounds`.

### Subsystem D — Dynamic World & Check Suite Blind Spots

#### D1. Vehicles and the train sink under/through 2-vertex flat bridge decks at transitions
- **Location**: `src/landmarks/life.js:211-228, 158-160, 298-299, 708`
- **Bug / Issue**: `chain()` drops a bridge's start vertex (`k === 0`), leaving `hs[i-1] = NaN` on the bridge's first segment (`ya[i] = NaN`). Vehicles and the train drop to `LAND_Y + rise` underneath the deck — across the **entire span** of 2-vertex flat bridges (e.g., `RAIL_S` in `bachho.js`).
- **Suggested Fix**: Store deck height per segment rather than per vertex in `chain()`, or keep short ramp vertices at bridge ends.

#### D2. Traffic ignores actual OSM road widths (`r.w`) and mixes classes in `chain()`, driving onto sidewalks, medians, and buildings
- **Location**: `src/landmarks/life.js:229, 301, 326-335`
- **Bug / Issue**: Chained paths inherit a single class `path.c` and ignore `r.w` (such as 6–7 m one-way carriageways of dual boulevards), spawning bidirectional cars/buses up to `5.68 m` from centerline — straight onto sidewalks, medians, and buildings.
- **Suggested Fix**: Store per-segment half-width `hw` on `path` and clamp `v.lane` inside `hw - vehicleHalfWidth - 0.3`.

#### D3. `buildLampPosts` desyncs from `city.js` night glows on slip roads, tapered roads, and elevated bridges
- **Location**: `src/landmarks/life.js:109-119, 452-466` vs `src/geo/city.js:289, 471-483`
- **Bug / Issue**: `readRoads()` drops `r[5]` (`unmarked` slip roads → unlit dark lamp posts) and `r[4]` (`ws` tapered widths → glows detached from lanterns / poles in carriageways), and never checks `onLand` or crossing carriageways.
- **Suggested Fix**: Share one lamp-placement generator between `city.js` and `life.js`, respecting `r.unmarked`, `r.ws`, `P.base(s)`, and `onLand`.

#### D4. `fleetRouter` & `check-boats.mjs` never test boats against riverbanks/islets; hoa đăng drift through Cầu Phú Xuân piers
- **Location**: `src/landmarks/boats.js:319-326, 544-575`, `scripts/check-boats.mjs:35`
- **Bug / Issue**: Neither `fleetRouter` nor `check-boats.mjs` checks hull corners against `isLand(x, z)`, allowing boats to clip banks/islets in narrow bends. `makeLanterns` only tests `isLand`, so hoa đăng float straight through Cầu Phú Xuân piers and Nghênh Lương Đình's landing.
- **Suggested Fix**: Add 4-corner `isLand()` checks to `fleetRouter` and `check-boats.mjs`, and exclude pier footprints in `makeLanterns`.

#### D5. Additional Check Suite blind spots (vertical walls, self-overlap, missing roofs, trees on structures)
- **Location**: `scripts/check-overlap.mjs:53-54, 228-241, 260`, `scripts/check-roofs.mjs:73-94`, `scripts/check-trees.mjs:18, 42-56`, `scripts/check-data.mjs:126-148`
- **Bug / Issue**:
  - `check-overlap.mjs` ignores vertical walls (`ny < 0.35 * len`) and intra-source self-clipping (misses `duyetthi` corridor-through-roof).
  - `check-roofs.mjs` never checks for missing/zero-triangle roofs (misses roofless Bi Đình at `tuduc`).
  - `check-trees.mjs` never checks trees against `structures`/ramparts/gates (`Cửa Kẻ Trài`) and allows `45%` crown overhang on narrow roads (`khaidinh`), while `check-data.mjs` ignores `c === 5` footways.
- **Suggested Fix**: Add vertical-wall footprint rasterization + intra-place sub-structure checks, verify hall roofs exist in `check-roofs.mjs`, and check tree trunks against non-walk structure faces + tighten narrow-road crown overhang.

---

## 4. Medium-Severity Findings

### Geometry & Terrain (`src/geo/`)
1. **Flat bridges (`P.rise === 0`) not resampled for `LAND_RAMP`** (`src/geo/city.js:431-433`, `src/geo/bridges.js:247-255`): 2-point flat bridges evaluate `P.y(s)` only at the landed ends (`STREET = 0.06 m`), collapsing the deck 36 cm below `DECK = 0.42 m` so traffic floats above the deck and piers poke through.
2. **GLSL ES 3.00 undefined `log2(0.0)` on tree trunks/limbs/cores** (`src/geo/foliage.js:480-482`): Constant UV `SOLID` yields zero derivatives (`dFdx = dFdy = 0`), passing `0.0` to `log2()` — undefined per spec and can produce `NaN` on Metal/mobile GPUs. Clamp input to `max(1.0, ...)`.
3. **Infill water tank offsets not rotated by building angle `ang`** (`src/geo/city.js:788-792`): Offsets applied in world X/Z can float tanks off the side of rotated narrow tube houses.
4. **Infill gable end walls protrude 0.55 m past facades** (`src/geo/city.js:773-777`): `ends` scaled to `d + 1.1` (roof overhang) instead of wall depth `d`.
5. **Flat-roof colour trays pop colour at 1500 m LOD** (`src/geo/city.js:786, 815`): Roof trays are bucketed into `extras` (`detail = true`, 1500 m) while walls stay visible to 5200 m.
6. **Redundant `BufferGeometry.clone()` per chunk in `infillPlanter`** (`src/geo/city.js:726-730`): Clones all 6 geometries per chunk/tile even though only `geos.wall` attaches per-chunk attributes, creating hundreds of duplicate VBOs/VAOs.
7. **`drape()` misses hills along long straight road segments** (`src/geo/terrain.js:115-122`): Samples `rise()` only at vertices and midpoint (`t = 0.5`); segments > 25 m crossing a hill shoulder at `t = 0.25/0.75` cut underground.
8. **`junctionHoles` cluster cutoff & `slivers` spatial grid radius too small** (`src/geo/junctions.js:75-76, 270, 298`): Dense grids exceeding `4e6` cells silently skip *all* junction holes in the district; `slivers` grid radius `r.w/2 + 8` misses parallel class-0 roads (centre spacing up to `17.4 m`) and ignores `r.ws`.

### Rendering, Shaders, Post & Shadows (`src/env/`, `src/geo/materials.js`)
9. **`updateShadow()` runs before `updateDetail()`, making `lodFlips()` 1 frame stale** (`src/main.js:347-349, 380-381`): Newly visible LOD chunks render shadowless for 1–2 frames.
10. **Tight shadow cascade centered at `y = LAND_Y` (`2.6 m`) shifts off-target on hills** (`src/main.js:304-307`, `src/env/csm.js:20-38`): On 40–105 m hills, the afternoon sun ray projects `focus` up to ~95 m laterally off the summit, losing the tight shadow cascade.
11. **NaN/Inf guard in `OcclusionPass.compMat` runs *before* AO, mist, and ink math** (`src/env/post.js:45, 113-115, 128`): Unguarded `normalize(cross(dx, dy))` in `aoMat` and `dist == 0` in `compMat` can still inject NaNs into DoF/Bloom.
12. **Double render-target reallocation on resize + wasted 4× MSAA on `renderTarget2`** (`src/env/post.js:308-326`): `composer.setPixelRatio(1)` + `composer.setSize(...)` reallocates all 15+ FBOs twice per resize, and `renderTarget2` wastes 40–80 MB VRAM on unused MSAA + depth.
13. **Western horizon mountain ridge seam from `atan(d.z, d.x)`** (`src/env/sky.js:55-58`): `+π/-π` jump due West creates a vertical cliff seam in the skybox mountain silhouette.
14. **Street-level shopfront normal relief (`hueHgt`) immediately overwritten** (`src/geo/materials.js:264, 298`): Line 298 uses `=` instead of `+=`, wiping out shopfront recess normals.

### UI, Input, Fallback & Content (`src/ui/`, `src/main.js`, `public/data/stories.json`)
15. **2D fallback `fit()` divides by negative/zero on short viewports (`H <= 200`); pinch `d === 0` divide-by-zero; SVG markers keyboard-inaccessible** (`src/ui/fallback.js:112, 138-145, 183, 220`).
16. **Search UX bugs**: `Escape` fails when focus is on `#q-toggle` or filter chips (`src/ui/search.js:197, 206`); "All" (`filter === 0`) lists only 22 curated places (fewer than "Monuments"'s 36); unused `overview: true` flag in `content.js:251`.
17. **Pointer tracking leak in `main.js`** (`src/main.js:187-219`): `pointerup`/`pointercancel` only listen on `canvas` and never clear on `blur`, so releasing a drag outside the window permanently leaks `downs` and breaks all subsequent single-finger taps.
18. **Language switching leaves stale strings** (`src/ui/ui.js:39-48, 64-86, 121`, `index.html:8, 17`): `btn-rain` tooltip/aria-label ignores `aria-pressed`, `document.title` stays Vietnamese, mobile `#places` quick-strip never translates to English, and empty `im.license` leaves trailing `" · "`.
19. **`ResizeObserver` `borderBoxSize[0]` crash risk on older WebKit + `stories.json` omits `BASE_URL`** (`src/ui/ui.js:96, 207`).
20. **Right safe-area inset ignored & tablet `#hint`/`#card` overlap** (`src/ui/style.css:30, 159`): `--edge` only reads `safe-area-inset-left` (clips right notch in landscape iOS); `#hint` overlaps `#card` on 721–1050 px tablets.
21. **Content & data gaps in `stories.json` vs `places.json`**:
    - **17 of 83 places** have no `stories.json` entry (including featured `thuyxuan`, `phuongduc`, `sinh`, `golim`, `daVien`, and all 12 gates).
    - **15 stories** have no images (including `aeon`, `benxenam`, `benxebac`, `ndchieu`, `photay`).
    - **10 image credits** contain garbled duplicate strings: `"Unknown authorUnknown author"` (`dainoi`, `thieutri`, `nghenhluong`, `gahue`).
    - **46 stories** carry dead unused `eras` fields from a removed feature.
    - Tier-2 `phuxuan` lacks a custom `VIEWS` entry in `src/ui/content.js`.

### Dynamic World (`src/landmarks/`)
22. **11.3 m buses and 20 m train carriages never pitch on hills or humped bridges** (`src/landmarks/life.js:411-415, 771-775`).
23. **Pedestrians walk down the middle of class-3 residential streets and can enter water or clip esplanade structures** (`src/landmarks/life.js:508-564`).
24. **Boat wakes clip with a hard rear cutoff at top speed (`uLen = 118.25 m > 110 m`) and sweep rigidly sideways during U-turns** (`src/landmarks/boats.js:204-217, 285-290`).
25. **Dragon boats have no boat-to-boat collision avoidance** (`src/landmarks/boats.js:406-444`): faster boats overtake straight through slower boats in shared lanes and sweep across oncoming lanes during U-turns.
26. **Lotus pads/blooms spawn inside water pavilions and bridge piers** (`src/landmarks/life.js:34-47`).
27. **Un-culled per-frame matrix updates & GPU uploads for ~1,500 distant vehicles and pedestrians** (`src/landmarks/life.js:386, 397-418, 636, 673-695, 767-777`), plus train re-uploads every frame while stopped at Ga Huế.
28. **Frame 0 renders night glows at `uScale = 1` (invisible) and boat lights off** (`src/main.js:379-381`, `src/landmarks/boats.js:378, 696`) because `draw()` runs before `step(0)`.

---

## 5. Low-Severity Polish & Cleanup

1. **Citadel bridge end posts ignore mitred end normal `M[i]`** (`src/geo/citadel-bridge.js:128-136`).
2. **`coverOf()` slope under-estimation & `buildingOff()` concave U/L-shape centroid bypass** (`src/geo/city.js:920, 1000-1005`).
3. **Module-level `lod.js` list never cleared; `world.addTile` closure retains large spatial indices after all tiles load; dead vars `zero`/`p0` in `city.js`** (`src/geo/lod.js:5-16`, `src/geo/city.js:685, 707, 1012-1017`).
4. **Asymmetric silhouette ink fade against sky in illustrated mode** (`src/env/post.js:118-125, 202`).
5. **Rain shower auto-stop uses wall-clock `performance.now()` instead of simulation `time`** (`src/env/mood.js:85-87`).
6. **Unconditional screen-space relief derivatives on flat/zero-`hueHgt` surfaces & fp16 `1e-9` underflow risk** (`src/geo/materials.js:423-431`).
7. **Floating restaurant additive night meshes stay `visible = true` during daytime** (`src/landmarks/floating.js:298-308, 323`).
8. **`places/index.js` rollback on exception leaks dynamic `group.children` and `S.paved`/`S.noCover`/`S.roofs` ranges** (`src/landmarks/places/index.js:53-62`).
9. **Dead `lampGlows1935` wiring in `buildStreetLife`** (`src/landmarks/life.js:436-438`).
10. **No check verifies lateral structural attachment for bridge-side balconies** (e.g., `bachho.js` detached pavilions).
11. **Label DOM churn when stationary & brief focusable `aria-hidden="true"` window during fade-out** (`src/ui/labels.js:72-100`, `src/ui/style.css:202-204`).
12. **`#seg-lang` radiogroup missing roving `tabindex`/arrow keys; `/` shortcut misses `textarea`/`contentEditable`; `<meta name="theme-color">` static in night mode** (`index.html:6, 34-37`, `src/ui/search.js:219`).
13. **Misleading comment in `src/geo/joints.js:4`** contradicting line 25's `r.bridge || r.head` grouping.

---

## 6. Height, Scale & Whole-Model Elevation Audit

A dedicated quantitative audit of `public/data/hue.json`, `public/data/places.json`, `docs/heights-reference.json`, and `scripts/check-heights.mjs` surfaced **four systemic height problems** affecting both individual landmarks and the whole city model:

### H1. Whole-City Elevation & Bridge-Deck Datum Mismatches
- **Problem**:
  1. **Ordinary road & rail bridges sit ~3 m too low above the river**: `LAND_Y` was calibrated to `2.6 m` above the river (`3.5 m` ASL city floor vs `0.9 m` ASL river). Hand-modelled bridges (`truongtien` 6.4 m deck, `nguyenhoang` 6.8 m deck) were fixed above water, but ordinary road/rail bridges (`Cầu Phú Xuân`, `Cầu Dã Viên`, `Cầu Bạch Hổ`, `Cầu Gia Hội`, `Cầu An Cựu`, `Cầu Chợ Dinh`) still sit nearly level with the bank (`~3.0 m` above water vs `5.5–7.5 m` real navigational clearance).
  2. **DSM-as-ground artifacts (`output_hh.tif`, commit `b44900e`)**: The 30 m elevation raster is a surface model (DSM) rather than bare earth — tree canopies and dense building clusters on slopes leak into ground height. Even after the 8% road-grade smoother (`±5 m` cap), 4 road breaks up to **25% grade** remain where roads meet locked river banks, and 16 plain landmarks sit on artificially flattened 60 m pads that step against neighboring sloped streets.
  3. **No ground below `LAND_Y`**: Low-lying river flats, rice paddies (Sình, Cồn Hến, An Vân Dương), and canal banks below `3.5 m` ASL are clamped flat to `LAND_Y = 2.6 m`, erasing low-bank transitions.
  4. **Camera, shadows & labels assume flat `LAND_Y`**: `controls.js`, `updateShadow()`, and `labels.js` all anchor to `y = 2.6 m`, breaking navigation, shadows, and labels on every hill (`10–332 m`).
- **Solution**:
  - Give major river bridges (`phuxuan`, `bachho`/Dã Viên, `giahoi`, `chodinh`) proper arched/elevated deck profiles (`5.5–7.0 m` above water) with smooth approach ramps (`60–100 m`) blended into bank roads.
  - Blend `output_hh.tif` with bare-earth FABDEM/ICESat-2 residuals in forested hill areas (or apply a morphological ground filter) so canopy height is not baked into road/hill terrain.
  - Anchor camera targets, tight shadow focus, and label ceiling checks to `LAND_Y + rise(x, z)` everywhere.

### H2. Specific Landmark Height Anomalies (`modelH = a - groundY`)

| Place | `modelH` (built) | Real / Ref Height | Problem | Solution |
|---|---:|---:|---|---|
| `nguyenhoang` (Cầu Nguyễn Hoàng) | **29.4 m** (`32.0 m` above water) | ~17–20 m above water | Arch crown is ~1.6× too tall (`places.json` declares `h: 14`) | Lower arch rise in `src/landmarks/places/nguyenhoang.js` to ~11–13 m above the 6.8 m deck (~18–20 m above water) |
| `baotanghcm` (Bảo tàng Hồ Chí Minh) | **22.1 m** | ~14–16 m | Overshot by ~6–8 m (as tall as 7-story Tháp Phước Duyên!) due to inflated storey/roof estimates (`1.0 + 12.2 + 5.6 + lantern`) | Rescale storey heights (`3.4 / 3.2 / 3.0 m`) and roof/lantern to ~15–16 m total in `baotanghcm.js` |
| `aeon` (AEON MALL Huế) | **27.0 m** | ~20–22 m (4 floors) | Overshot by ~5–6 m (`places.json` declares `h: 24`) | Trim floor-to-floor height in `aeon.js` to ~21–22 m |
| `tayloc` (Chợ Tây Lộc) | **3.8 m** (at place pt) | ~8–10 m (2-story hall) | Place anchor hits low stall shed (`3.8 m`) and central hall is under-proportioned | Raise 2-story central hall to ~8.5 m and align place point to the main hall |
| `benxenam` / `benxebac` | **5.7 m / 7.8 m** | ~10–12 m (pitched roof) | Undersized flat boxes | Rebuild with pitched terracotta/red roofs reaching ~10–11 m |
| `thienan` (Đan viện Thiên An) | **17.4–19.6 m** | 20–25 m (with bell tower) | Missing iconic multi-tiered bell tower; passes `check:heights` only via ±25% tolerance | Model the multi-tiered Asian-style bell tower to ~23–24 m |
| `gahue` (Ga Huế) | **14.0 m** | 10–12 m | Over-tall central block (`+2–4 m`), passes only because `12 × 1.25 = 15.0 m` | Lower central hall + pitched roof + clock pediment to ~11.5–12.0 m |
| `thaihoa` (Điện Thái Hòa) | **13.1 m** | 11.8 m (sourced) | `+1.3 m` (`+11%`) over documented height | Trim roof/ridge height by ~1.2 m to match 11.8 m |
| `ngubinh` (Núi Ngự Bình) | **+13.0 m** above summit | 0 m (flat summit) | Label anchor `a = 116.4 m` catches a tall tree/object above the `103.4 m` summit | Exclude trees from `build-label-tops.mjs` for terrain/hill places |

### H3. City-Wide Building Height Outliers & Stale `places.json` Fallbacks
- **Problem**:
  1. **GISHue height outliers near Vincom & outside urban core**: 20 mapped buildings within 300 m of Vincom stand `25.5–58.0 m` tall (42 buildings ≥ 30 m citywide, up to `79.8 m`), and outside GISHue's 12.6 km² drone-survey core, coarse DSM readings inflate buildings under tree canopies. Conversely, 323 mapped OSM buildings are clamped at `≤ 3.5 m`.
  2. **Stale `places.json` `h` & 12 missing `a` anchors**: 12 places (`dainoi`, `kinhthanh`, `tinhtam`, `bachho`, `hoquyen`, `thuyxuan`, `sinh`, `dongkhanh`, `thieutri`, `thuytien`, `conhen`, `daVien`) have `a = null` and fall back to stale hand-typed `h` values (e.g., `dongba: 30` from the demolished 1967 clock tower, `truongtien: 22` vs `9.6 m`, `canchanh: 8` vs `12.2 m`, `tuduc: 16` vs `5.5 m`).
- **Solution**:
  - Cross-check GISHue building heights > 25 m against OSM `building:levels` / Google Open Buildings (flagging or capping outliers where GISHue exceeds `levels * 4.2 m` by > 50%).
  - Audit and sync `places.json` `h` values with actual built heights and widen `build-label-tops.mjs` search radius (or use site centroids) for the 12 places currently missing `a`.

### H4. `check-heights.mjs` Coverage & Loose Tolerance Blind Spots
- **Problem**:
  - `docs/heights-reference.json` covers only **33 entries** (6 of which are courtyard cauldrons/kỳ lân) — **over 55 of 83 landmarks have zero height verification** (`ngomon`, `kydai`, `thienmu`, `truongtien`, `nguyenhoang`, `quochoc`, `kientrung`, `themieu`, `baotanghcm`, `aeon`, `hoquyen`, `tudam`, `baoquoc`, `hienlam`, and 8/10 Citadel gates).
  - Applying **±25% tolerance on top of an already-wide `[lo, hi]` range** creates a >2× pass window (e.g., `[20, 25]` accepts `15.0–31.25 m`), masking missing towers (`thienan`) and over-tall models (`gahue`).
- **Solution**:
  - Add all major unchecked landmarks (`ngomon`, `kydai`, `thienmu`, `truongtien`, `nguyenhoang`, `quochoc`, `kientrung`, `themieu`, `baotanghcm`, `aeon`, `hoquyen`, `tudam`, `baoquoc`, `hienlam`, and all 10 Citadel gates) to `docs/heights-reference.json`.
  - Tighten `check-heights.mjs` tolerances to **±8% for sourced** and **±12% for estimated** (and do not stack percentage tolerance on top of an already-explicit `[lo, hi]` range — use `max(range, center ± tol)` instead).

---

## Prioritized Fix Roadmap

| Phase | Focus | Key Items |
|---|---|---|
| **Phase 1 — User-Facing Breakage** | Fix the most visible runtime, visual & mobile bugs | `C1` hill camera targets, `C2` 2D→3D retry trap, `QA1` rain white blowout, `QA2` night floodlight blowout, `QA3` mobile card/tool/hint overlap, `QA4` night/rain HUD text contrast, `C6` hidden t=3/4 labels, `C8` broken card photo placeholder |
| **Phase 2 — Rendering & Perf Wins** | Free GPU budget & fix water/ink glitches | `B1` Reflector layer-1 exclusion (huge perf win), `B2` alpha-preserving rain/glows in ink mode, `B3` horizontal river reflection smear, `B4` black reflection flash on resize, `M12` double FBO resize & unused MSAA on `renderTarget2` |
| **Phase 3 — Heights, Roads, Bridges & Traffic** | Fix elevation, bridge clearances, landmark heights & traffic | `H1` river bridge deck heights & hill terrain filtering, `H2` fix `nguyenhoang`/`baotanghcm`/`aeon`/`thienan`/`gahue` heights, `A1` +12 cm snapped approach roads, `A2` tapered bridge `NaN` width, `A3`/`D3` bridge lamp crash & desync, `M1` flat bridge `LAND_RAMP` collapse, `D1` vehicles/train sinking through 2-vertex bridges, `D2` traffic ignoring road width, `D4` boats vs banks & hoa đăng vs piers |
| **Phase 4 — Harden Automated Checks** | Close CI blind spots before fixing 3D models | `C3` `check-overlap.mjs` `min(up)→max(up)`, `C4` Citadel rampart checks, `D5` vertical wall / self-clipping / missing roof / tree-on-structure checks, `H4` expand `heights-reference.json` & tighten tolerances |
