# Cồn Hến (`conhen`)

Model: `src/landmarks/places/conhen.js`. It adds to the island and replaces nothing. The land and water edges are
still drawn by `src/geo/city.js` from the OSM land ring, and the houses and lanes still come from the shared data.
No older builder drew anything here (content.js holds only the label), so no guard was needed. `city.js`,
`build-data.mjs` and `boats.js` are unchanged.

## Sources
- Local OSM extract (`data/raw/hue-osm.json`):
  - the island outline (hue.json `land[25]`, about 1.6 km by 230 m);
  - landuse=residential way 586296682 (where the village ends);
  - the lanes (Ưng Bình and the kiệt) and the bridge Cầu Phú Lưu;
  - a Buddhist place of worship on Ưng Bình;
  - statue node 5314360729 (Quan Âm) beside it.
- vi.wikipedia, Cồn Hến: https://vi.wikipedia.org/wiki/C%E1%BB%93n_H%E1%BA%BFn
  - The islet lies in the Hương River off Vỹ Dạ, in phường Phú Hiệp / Vỹ Dạ.
  - It is about 1.5 km long and at most about 230 m wide.
  - Its village (Bồi Thành, formerly Hến) lives on clams: the hến are raked from boats, boiled and shelled on the banks.
  - It is known for cơm hến and for chè bắp grown on its sandbars.
- Exploring Cồn Hến (tourism page): https://vinwonders.com/vi/wonderpedia/news/kham-pha-ve-dep-con-hen/
  It covers the clam boats, the shell heaps, the corn fields, Đình Bồi Thành and the pagodas.
- Embankment and renovation plans (2025):
  - https://thuonghieucongluan.com.vn/ubnd-thanh-pho-hue-quyet-dinh-dau-tu-chinh-trang-con-hen-a275212.html
  - https://24hmoney.vn/news/tp-hue-len-ke-hoach-chinh-trang-con-hen-c27a2640149.html
  - Both give about 24 ha of land and a planned embankment about 3.2 km long. Both describe it as planned, not built.

## Confirmed
- The shore outline, the village area, the lanes and the bridge (OSM).
- The banks are natural earth and sand. The new embankment is only planned, so it is not drawn.
- Clam-boat landings and shell heaps on the banks, corn and vegetable plots on the open sandbar, and coconut palms
  and bamboo along the shore (all sources).
- There is a communal house (Đình Bồi Thành), and a pagoda with a white Quan Âm statue on Ưng Bình (OSM node).

## Estimated
- The đình's position: on the Ưng Bình frontage at about (425, -1452). Its form is also estimated: a yard with a
  lime wall, a four-pillar nghi môn, a screen wall (bình phong) and a one-storey hall with a tiled hip roof.
- The pagoda's identity: the OSM place of worship is taken to be Chùa Pháp Hải. Its layout is estimated: a gate
  facing the main river, the statue in the court, and a two-tier main hall with a rear hall behind.
  - Some OSM house outlines stand inside the pagoda yard. They are left in place, since they may be the pagoda's
    own side buildings.
- The positions of the 15 landings and 9 single moored boats, the number of boats at each, and which landings
  have shell heaps.
- The positions of the 5 small bank shrines (miếu).
- The field layout: 8 by 17 m plots, about 55% corn and 30% vegetables, the rest bare soil.
- The garden trees: up to 900 extra trees pushed into `data.trees`, thinner outside the village.
- Phủ Thành Hoàng: no source places it on the island, so it is not drawn.

## What changed
- New replica `conhen.js`, about 34k triangles, plus about 580 extra garden trees for the shared tree builder.
  It draws:
  - sloped bank faces in two bands (dry earth, then wet mud) around the whole OSM shore;
  - concrete step landings with moored sampans (some with arched mat roofs, others carrying clam-rake poles),
    shell heaps and lamps;
  - the đình and the pagoda with its Quan Âm statue, with houses and trees kept off both through `S.paved` and the
    reserved areas;
  - bank shrines, and corn and vegetable plots on the northern sandbar (paved, so no generated houses land on them);
  - coconut palms leaning over the water and bamboo clumps along the banks.

## What is left
- Pin down the đình's exact position and the pagoda's name from a site survey or photos.
- Draw the 3.2 km embankment once it is built.
- The bamboo is coarse (cone leaf masses) to stay inside the budget.

## Google satellite and Street View check (2026-11)
Compared against Google satellite (z17/z19/z20) and three car Street View panoramas on the island (captures kept in
scratch, not in the repo).
- Position and axis: the OSM shore, Ưng Bình, the east-bank lane (Ưng Bình tờ 19) and the west-bank lane fall on the
  satellite within ~2 m; the axis matches. The east shore seems ~10 m further out on the satellite, but that is the
  tree canopy hanging over the water, not the bank. No re-framing was needed.
- Lanes: on the satellite and in all three panoramas the island's kiệt are 3-4 m concrete lanes, not 6.5 m streets.
  The 42 unnamed residential ways on the island are now listed in `data/road-types.json` as `unmarked-1` (4 m, no
  dashes, no lamps). Ưng Bình itself (~6 m on the satellite) keeps the residential width.
- Banks: both banks are one unbroken belt of shade trees and bamboo (about 10-20 m deep on the west, 15-30 m on the
  east). The builder now adds two staggered rows of the shared trees every ~6 m along the shore, as well as the palms
  and bamboo clumps.
- Not changed: the houses come from the shared infill and do not reproduce the individual houses in the panoramas
  (a yellow two-storey house with an arched door, a white neo-classical villa, tin-roofed food stalls). The đình and
  the pagoda could not be identified on the satellite, so their estimated positions are kept.
