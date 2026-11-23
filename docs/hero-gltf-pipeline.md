# Hero `.glb` Asset Pipeline (Track C)

`hue_city_explorer` uses a **hybrid rendering pipeline**:
1. **Shared static `Buf` (`src/landmarks/places/*.js`)**: renders all 83 landmarks in ~1 draw call per material at 2–3 ms/frame with full CI geometry checks (`check:burial`, `check:overlap`, `check:heights`, `check:roofs`).
2. **Self-hosted lazy `.glb` hero assets (`src/geo/hero-gltf.js`)**: streams sculpted organic/ornate `.glb` meshes from `public/data/models/` on demand when the camera approaches within `radius` metres or the visitor picks the landmark (zero startup cost, zero external network requests).

## Dual-look (`ink` + `real`) integration

When `createHeroLoader` loads a `.glb`, `bindCityMaterial()` automatically:
- Computes normals if missing.
- Sqrt-encodes linear glTF `COLOR_0` vertex colors (or `material.color`) so `cityMaterial`'s `vColor * vColor` fragment decode reproduces exact linear RGB.
- Attaches `aKind` (default `KIND.PLAIN`, overridable via `mesh.userData.hueKind`) and `aBase` attributes.
- Binds `cityMaterial()` so the `.glb` renders natively in **both** Realistic (`real`) and Illustrated (`ink`) looks, casts/receives cascaded shadows, and responds to rain darkening and fog.

## Authoring a hero `.glb` in Blender + `gltf-transform`

1. Model in **metres**, Y-up, centered on the landmark's local origin (`pos` & `rotY` in `HERO_MODELS` inside `src/geo/hero-gltf.js`).
2. Paint materials using **vertex colors** (`COLOR_0`, linear RGB) or flat `Principled BSDF` base colors (avoid heavy image textures so `ink` mode stays crisp and bundle size stays < 150 KB per hero).
3. Export as `.glb` (`glTF Binary`, `+Y Up`, `Apply Modifiers`).
4. Optionally optimize with `gltf-transform`:
   ```bash
   npx @gltf-transform/cli optimize input.glb public/data/models/<slug>-hero.glb --compress meshopt
   ```
5. Register the entry in `HERO_MODELS` in `src/geo/hero-gltf.js`.

## Scripted hero `.glb` build (pilot)

`scripts/build-hero-glb.mjs` builds the pilot sculpted hero `.glb` (`public/data/models/ngomon-hero.glb` — Catmull-Rom spline dragons, curved *đao mái* roof scrolls, and turned *pháp lam* gourds for Ngọ Môn's Lầu Ngũ Phụng):

```bash
node scripts/build-hero-glb.mjs
```
