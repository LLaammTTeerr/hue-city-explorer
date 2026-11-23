# Design, Beauty & Styling Review

- **Reviewed revision**: `origin/main` (`30f1b3f`, 2026-11-23)
- **Method**: Direct visual critique of rendered desktop (`1400×900`) and mobile (`390×844`) captures across both rendering styles (**Illustrated / Ink** and **Realistic**), all atmosphere moods (**Morning**, **Golden Hour**, **Night / Lên đèn**, **Rain / Mưa rào**), **Overview diorama**, **Ngọ Môn hero close-up**, **AEON MALL / Ngự Bình cards**, and **`?nogl` fallback**, alongside a full review of `src/ui/style.css`, `index.html`, `src/config.js`, `src/env/`, and `src/geo/materials.js`.
- **Companion reports**: [`docs/model-audit.md`](model-audit.md) (83-model visual grades) and [`docs/comprehensive-review.md`](comprehensive-review.md) (66 functional/technical/height bugs).

---

## Overall Aesthetic Verdict

**Art Direction: 8.5 / 10 — Execution & Polish: 6.8 / 10**

The *creative direction* is genuinely distinctive and culturally rooted — far above a typical 3D map:
- **Dó-paper & vermilion-seal UI** (`#f5efe2` parchment, `#9e2a2b` crimson, gold hairlines, rotated `順化` seal, Fraunces variable serif + Be Vietnam Pro) feels like an editorial heritage atlas rather than a generic GIS dashboard.
- **Illustrated look (default)** in morning and golden-hour light has real storybook charm: unified pen-outlined tree crowns, hatched roof slopes, and calm jade-wash river.
- **Tím Huế twilight (`Lên đèn`)** — indigo-violet Perfume River, sliding rainbow light band on Cầu Trường Tiền, lotus-shaped floating restaurant, and drifting hoa đăng — is deeply atmospheric and immediately evokes Huế at night.

However, **specific lighting, shader, composition, and UI-styling rough edges** break that magic in key moments (rain, night, overview diorama, mobile, and the opening foreground).

---

## 1. 3D Scene Beauty & Art Direction

### 1.1 Opening Hero Composition Dominated by Three Blank Utility Boxes
- **What we see**: In the opening frame (above Trường Tiền looking upstream), the foreground banks are dominated by three huge, sterile geometric blocks: the bright-white D-shaped market annex on the right bank, the vast flat dark-grey roof of Chợ Đông Ba right below it, and a massive blank grey slab on the left bank.
- **Why it hurts**: The opening 2 seconds set the emotional tone. Right now, boxy modern roofs steal visual weight from Cầu Trường Tiền, Phố đi bộ Nguyễn Đình Chiểu, and the Citadel.
- **Suggestion**:
  - Give Chợ Đông Ba its real multi-bay green-teal pitched/clerestory roofs (already flagged in `model-audit.md`) and break up the D-shaped annex roof with HVAC/terrace/parapet detail and warmer off-white render.
  - Tone down roof luminance on generic foreground commercial slabs so the eye flows naturally along Trường Tiền toward Kỳ Đài and the distant Trường Sơn hills.

### 1.2 Overview ("Tabletop Diorama") Washed Out by Fog
- **What we see**: In the Overview view (`~6,500 m` camera distance), the northern half of Huế (Kinh Thành, Sông Hương, Cồn Hến) disappears into milky beige-pink fog. The diorama slab edge is visible at top-left, but the miniature city itself loses contrast and legibility.
- **Why it hurts**: `fogDensity` (`0.00012` in afternoon, `src/config.js:102`) is tuned for `200–900 m` views, not a `6.5 km` tabletop overview.
- **Suggestion**: Scale `fogDensity` down dynamically when camera altitude exceeds `1,000 m` (e.g., `fogDensity * mix(1.0, 0.22, smoothstep(1000, 3500, hgt))`), and add subtle rim contrast along the riverbanks so the whole-city diorama reads like a crisp architectural scale model.

### 1.3 Rain Mood (`Mưa rào`): Harsh Needle Streaks & Blinding Wet-Sheen Blowout
- **What we see**:
  - In **Realistic** rain, grazing IBL/sun specular on low-roughness wet riverbanks and parks explodes into **pure nuclear-white bloom patches** along the right bank.
  - In **Illustrated** rain, raindrops render as **rigid, perfectly vertical bright white scratches** across the frame, and because rain writes alpha into the post buffer, dark ink edges form around streaks.
- **Suggestion**:
  - Clamp wet roughness on grass/parks (`>= 0.35`) and damp specular/IBL in rain so puddles shimmer softly rather than clipping bloom.
  - Slant rain streaks slightly (`6–10°` with wind), lower their opacity/thickness, soften their ends with a vertical alpha gradient, and preserve destination alpha (`CustomBlending`) so illustrated mode never inks raindrops.

### 1.4 Night Mood (`Lên đèn`): Over-Blown Riverside Floodlights
- **What we see**: Generic riverside buildings flagged `KIND_FLOOD` (`src/geo/materials.js:541-550`) glow like **solid white lampshades** (especially the D-shaped annex and upstream hotels), overpowering the nuanced warm eaves of Ngọ Môn and the rainbow reflections of Trường Tiền.
- **Suggestion**: Lower the `KIND_FLOOD` emissive multiplier (`1.35 → 0.55–0.70`) and apply soft shoulder compression (`x / (1 + x)`) so warm uplight scallops model the architecture without blowing out into bloom.

### 1.5 Illustrated Look (`ink`) vs. Realistic Look (`real`) Polish
- **Background noise in `ink`**: Beyond ~600 m (e.g. behind Đại Nội), dense 1 px ink outlines on tiny distant buildings merge into a **noisy brownish-grey crosshatch soup** instead of clean simplified silhouettes.
  - *Fix*: Fade building-interior ink earlier with distance (`220–900 m`) while keeping silhouette/horizon ink clean.
- **Flat morning water in `ink`**: Morning `ink` water (`01_morning_ink`) reads as a uniform plasticky teal sheet lacking shoreline depth or subtle ripple texture, whereas `real` golden hour has a gorgeous shimmering sun path.
  - *Fix*: Add a subtle shoreline darker-jade wash (`10–15 m` from banks) and gentler calligraphic wave strokes in `ink` mode.
- **Roof specular streaking in `real`**: Imperial golden roofs (`thaihoa`, `ngomon`, `themieu`) and dark tomb roofs (`khaidinh`) show harsh diagonal/striped specular aliasing from above.
  - *Fix*: Increase tile roughness slightly (`0.42–0.52`), reduce normal-rib amplitude at grazing/far distances (mip-attenuate procedural tile ribs), and soften the roof tile contrast on `phucam` and `thienan`.

### 1.6 Ground & Esplanade Surface Aesthetics
- **What we see**: The ceremonial forecourt between Kỳ Đài and Ngọ Môn shows **splotchy pinkish-beige dirt patches** (`grassN` earth/grass wash) with scattered tiny grey pedestrian figures, making the Imperial City's grandest axis look muddy and unfinished. Also, the Kỳ Đài flag occasionally photobombs the bottom edge of Ngọ Môn's framed view.
- **Suggestion**:
  - Give sacred/imperial lawns (`PAL.green.sacred`, `park`) a tighter, calmer grass palette without harsh bare-earth blotches; reserve earth washes for hills and rural outskirts.
  - Add subtle stone flagstone/paving variation on ceremonial plazas and shift Ngọ Môn's default camera slightly higher/forward so Kỳ Đài's flagpole does not clip the bottom frame edge.

---

## 2. UI, Typography & Visual Craft

### 2.1 Dark Lacquer (`body[data-time='2']`) Paper-Dot Artifact & Contrast Gaps
- **What we see**:
  - The radial-gradient paper fibre dots (`7px × 7px`, `style.css:65, 75`) are subtle on warm parchment, but on dark lacquer (`#1b1523`) they show up as a **visible grid of pixelated polka dots** across the search bar, tool buttons, and bottom bar.
  - At night, `.compass .north`, `#places button.seen::before`, and `.label-place.seen > i` use dark crimson `--seal` (`#9e2a2b`) on `#1b1523` (~2.0:1 contrast — north needle nearly vanishes).
  - During the `0.45s` CSS mood transition, panel backgrounds darken faster than text/icons read cleanly, creating a muddy mid-grey flash.
- **Suggestion**:
  - Remove or soften the `7px` dot pattern in `body[data-time='2']` (use a smooth subtle vertical sheen gradient like real *sơn mài* lacquer instead of dots).
  - Switch `.compass .north` and `.seen` indicators to `var(--accent-ink)` (`#ec8a74`) in dark mode, and explicitly bind `#search h1` and `#attrib` to `var(--ink)` with high-contrast backgrounds across all moods.

### 2.2 Card Media Empty-Box Flash & Visual Polish
- **What we see**: When a place card opens before its Wikimedia photo finishes loading (or when offline/404, as seen on `ngubinh` and `ngomon` frame 1), `#card-media` displays a **tall empty grey rectangle** with caption/credit text dangling underneath.
- **Suggestion**: Collapse `#card-media` (or give it a refined low-contrast parchment skeleton with a subtle fade-in on `onload`) and hide the figure cleanly if the image fails — never leave a blank grey box above the title.

### 2.3 Label Visual Hierarchy & Crowding
- **What we see**: Around dense clusters like Đại Nội (`Ngọ Môn`, `Điện Thái Hòa`, `Duyệt Thị Đường`, `Hoàng thành · Đại Nội`, `Kinh thành Huế`), 5–6 identical parchment pills stack tightly together while background labels (`Hồ Tịnh Tâm`) linger at ghosted ~15% opacity over noisy roofs.
- **Suggestion**:
  - Differentiate area/district labels (`Hoàng thành · Đại Nội`, `Kinh thành Huế`) visually from point monuments — e.g., uppercase tracked sans-serif with no heavy box/stem, like classic cartographic map typography, so monument pills stand out cleanly.
  - Snap labels off below `0.25` opacity instead of letting ghosted unreadable pills float over roofs.

### 2.4 Control Discoverability & Visual Weight
- **What we see**:
  - The **Look switcher (`#btn-look`, pencil icon)** is one of the coolest features in the app (toggling between Illustrated and Realistic worlds), yet it sits silently as an unlabeled 42 px icon between "Labels" and "Share" with no hint of what it does until hovered.
  - In `#seg-time` (morning / golden hour / night), inactive icons (`--ink-soft`) can look overly faint on bright parchment, especially in rain.
- **Suggestion**:
  - Consider giving `#btn-look` a compact pill label (`Ink / Real` or `Vẽ / Thực`) on desktop, or a brief first-visit tooltip, so visitors actually discover both looks.
  - Slightly increase icon stroke contrast (`--ink-soft` → `color-mix(in srgb, var(--ink) 72%, transparent)`) inside `#seg-time` and `#tools`.

### 2.5 Mobile (`390×844`) Visual Harmony
- **What we see**: When a place card opens on a phone, it sits at `z-index: 2` directly over the right-hand tool column and compass, with the `i` icon and compass visibly bleeding through the translucent parchment right behind the card's `×` close button.
- **Suggestion**: Fade out `#tools` and `#nav` (`opacity: 0; pointer-events: none`) whenever `body.has-card` is active on `max-width: 720px` (just as `#places` already fades out on line 313 of `style.css`), giving the place card a clean, unobstructed sheet presentation.

---

## 3. High-Impact Design Upgrade Checklist

| Priority | Area | Change |
|---|---|---|
| **1** | Rain & Night Shaders | Clamp wet grass roughness (`>= 0.35`), damp rain specular, cap `KIND_FLOOD` emissive (`0.55–0.70`), and preserve alpha on rain/glows in `ink` mode |
| **2** | Overview Diorama | Reduce `fogDensity` dynamically above `1,000 m` altitude so the tabletop overview is crisp instead of milky |
| **3** | Mobile Card Sheet | Fade `#tools` and `#nav` while `body.has-card` is active on phones (`<= 720px`), and raise `#hint` `z-index` above `#card` |
| **4** | Dark Lacquer Theme | Replace `7px` polka-dot pattern with smooth lacquer sheen in `body[data-time='2']`; lift compass north & seen dots to `--accent-ink` |
| **5** | Card Photos | Collapse/fade `#card-media` gracefully until `onload` succeeds; never show a blank grey box |
| **6** | Cartographic Labels | Style `area` labels (`Đại Nội`, `Kinh thành`) as tracked borderless map typography; snap off ghosted `< 0.25` opacity pills |
| **7** | Ink Look Polish | Fade distant interior building ink (`220–900 m`) to avoid background crosshatch noise; add subtle shoreline depth to morning `ink` water |
| **8** | Opening Foreground | Upgrade Chợ Đông Ba's roof and tone down the sterile white D-shaped annex + left-bank grey slab |
