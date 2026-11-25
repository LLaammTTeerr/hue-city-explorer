# 3D Visual & Colouring Redesign Notes

> Status: **Planned / Deferred** — noted after the frosted-glass UI/UX redesign so we can settle the 3D look-dev direction separately.

## References

- **Architectural maquette / sunlit diorama:** [`reference/singapore-reference.jpg`](../reference/singapore-reference.jpg) — clean warm terracotta roofs, crisp ivory/limestone walls, strong directional sunlight with cool-tinted contact shadows, and subtle tilt-shift depth.
- **Painterly illustrated nature & water:** April Zhu’s *Pocket City* (nature upgrade) — luminous jade-to-teal river shallows with shoreline ripples, drifting morning river mist, warm-top / cool-underside foliage washes, and warm sepia-ink outlines with soft watercolor shading.

---

## Current Diagnosis

Comparing our current afternoon and street-level renders against the references:

1. **Narrow, dusty mid-tone palette (`src/config.ts` → `PAL`):**
   - Ground (`#ccc09d`), roads (`#76716e`), and weathered clay roofs (`#8c4232`–`#6f5a50`) sit close in value and saturation, flattening figure–ground separation from overview altitude.
2. **Flat ambient fill & hazy mid-ground (`src/config.ts` → `MOODS`, `src/env/post.ts`):**
   - Afternoon fill (`hemiI: 1.5`, `envI: 0.98`) combined with rose-violet fog (`#e6d6da`) softens shadow contrast across roof eaves, courtyards, and the Citadel moat.
3. **Uniform river surface (`src/env/water-shader.ts`):**
   - The Perfume River reads mostly as a single muted green-grey plane with specular glare, without a pronounced emerald/jade shallow band along the embankments and bridge piers or soft shoreline ripples.
4. **Noisy distant foliage & heavy Ink outlines (`src/geo/materials.ts`, `src/geo/shaders/city-surface.ts`, `src/env/post.ts`):**
   - Bright purple/orange accent trees (`bằng lăng` / `phượng vĩ`) read slightly speckled from far away, and canopies lack a sunlit-top to cool-shadow painterly gradient.
   - The `Ink` look (`V`) currently leans toward dark technical outlines rather than warm sepia-ink + watercolor washes.

---

## Proposed 3D Pillars

### 1. Palette & Roof/Wall Separation (`src/config.ts`)
- Warm and slightly clean up the **terracotta / Indochine roof** families so roofs read distinctly against ground and asphalt.
- Brighten **lime-wash ochre and warm ivory walls** and give pavements/kerbs cleaner pale-stone contrast.
- Keep Huế’s signature heritage accents (imperial gold tile `#dca024`, jade tile `#378a68`, aged Citadel brick `#625e57`) anchored and unmistakable.

### 2. Lighting, Shadow Sculpting & Post Grade (`src/config.ts`, `src/env/post.ts`)
- Increase sun-to-fill contrast in `day` and `afternoon` presets (slightly lower `hemiEnv`/`envI`, richer cool-tinted shadows, clearer street-canyon AO in `OcclusionPass`).
- Tune subtle highlight/shadow split toning (warm sunlit faces, cool slate-violet shadows) and gentle diorama depth-of-field so the city feels like a sunlit physical miniature.

### 3. Perfume River Shallows, Ripples & Morning Mist (`src/env/water-shader.ts`, `src/env/sky.ts`)
- Strengthen the **jade-emerald shallow gradient** near riverbanks, Cồn Hến, and bridge piers transitioning into deeper teal in the main channel.
- Add subtle animated **shoreline ripples / foam** along banks and piers.
- Explore a low-lying **morning river mist** layer (`time` near `0`) drifting softly over Sông Hương without obscuring the bridges.

### 4. Painterly Foliage & Refined Ink-Wash Mode (`src/geo/shaders/city-surface.ts`, `src/env/post.ts`)
- Add a soft **warm sunlit crown → cool deep-green underside** gradient to instanced canopies (`FOLIAGE_COLOR`) and harmonize blooming tree clusters (`phượng vĩ`, `bằng lăng`) so they read as lush strokes rather than high-frequency dots at overview height.
- Evolve `Ink` mode (`uLook = 1`) toward warm sepia/charcoal hand-drawn lines, soft watercolor tonal banding, and subtle dó-paper grain.

---

## Decisions to Settle Before Implementing

1. **Primary look direction** for the default realistic view (`look=real`):
   - **A — Sunlit architectural maquette** (closer to `singapore-reference.jpg`: crisp shadows, cleaner roofs/walls, subtle tilt-shift).
   - **B — Painterly illustrated** (closer to *Pocket City*: softer watercolor washes, luminous jade water, drifting mist).
   - **C — Hybrid:** Maquette realism in `look=real`, and full *Pocket City* watercolor-and-sepia-ink in `look=ink`.
2. **Scope of river & atmosphere additions:** Include morning mist and shoreline foam in the first pass, or start with palette + lighting + water gradient only.

## Verification Plan (When Implemented)

- Run `npm run check` and `npm run build`.
- Capture before/after comparisons via `node scripts/compare.mjs` across:
  - Opening view (day, afternoon, night)
  - `ngo-mon-arrival` and `truong-tien-river-level`
  - Street-level close-up in both `real` and `ink` modes
