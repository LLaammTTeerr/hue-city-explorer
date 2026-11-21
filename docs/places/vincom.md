# Vincom Plaza Huế / Meliá Vinpearl Huế (`vincom`)

Model: `src/landmarks/places/vincom.js`. The old builder (`vincom()` in `src/landmarks/civic.js`) now skips it through `replaced('vincom')`.

## Sources
- OSM way 749331141, read from `data/raw/hue-osm.json`: the footprint (a pentagon about 70 × 68 m), `building=commercial`, `building:levels=39`, `height=160 m`, 50A Hùng Vương. Overpass refused connections from here, so the local OSM extract was used.
- https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Hu%E1%BA%BF: Meliá Vinpearl Huế, 160 m, 39 floors, 2018, the tallest building in Huế.
- https://nhadautu.vn/vingroup-khai-truong-vinpearl-hotel-hue-dang-cap-5-sao-quoc-te-d13449.html: 33 floors above ground and 2 basements, 213 rooms, a V-shaped tower, Vincom Plaza directly below it, at the Hùng Vương six-way junction, a rooftop pool and a sky bar.
- https://baophapluat.vn/vingroup-dong-tho-du-an-khach-san-5-sao-tai-tphue-post192002.html: groundbreaking report from 2015. Site over 4,500 m², fronting Hà Nội, Đống Đa and Hùng Vương streets, mall on floors 1–4, neoclassical style. This is the pre-build plan.
- Photos on Wikimedia Commons (used for form and colour):
  - https://commons.wikimedia.org/wiki/File:Vincom_Plaza_Hue.jpg (2018, corner entrance with the whole tower)
  - https://commons.wikimedia.org/wiki/File:Hu%E1%BA%BF_2024_-_Vincom_Plaza_-_img_01.jpg (2024, podium bays and the V tower)
  - img 03, 02 and 06 of the same 2024 set (interior, and a paved forecourt with stalls)

## Confirmed
- The footprint and position (OSM).
- Total height 160 m (OSM and Wikipedia). The model's mast top is at 160 m; `npm run check` passes. The 39 levels in OSM against the 33 in the press report: 33 hotel floors plus the podium.
- From the photos:
  - Podium: a dark brown granite ground storey, and above it cream stone in tall bays between flat pilasters. Each bay is a dark recessed panel (glazing or a banner) under a gold chevron grille, which is lit at dusk.
  - Above the bays: a dark band, then a deep dark eave with a glass balustrade and planting.
  - Corner entrance pavilion: rises above the cornice, carries the red "VINCOM PLAZA" letters, and has a tall glass portal in a granite frame.
  - Tower: set back on a glazed storey. A dark-blue glass curtain wall with light vertical mullions, dark-clad narrow ends, a prow edge, and an open frame round the roof.

## Estimates
- Storey heights: granite storey 5.6 m, cornice at 21 m, eave at 23.6 m, setback storey to 29.4 m, tower glass to 151 m, crown frame to 157.4 m, mast to 160 m.
- Tower plan: 44 × 22 m, a shallow V with a 3.2 m prow towards the roundabout, back 14 % narrower. No plan drawing was found; the shape is read from "hình chữ V" and the 2024 photo.
- The entrance is placed on the short NE front facing the roundabout. The canopy depth, the bay count (~7.6 m bays), which bays carry banners and their colours, the forecourt outline (cut short of the Đống Đa kerb) and the planters are all estimates.
- Lit hotel rooms at night are a fixed scatter, about 1 pane in 8.

## Changed (vs the old civic.js model)
- The old model had a 46 × 25 m box tower on a plain 23 m prism. It is replaced by the V-plan glass tower (mullions, dark ends, prow, crown frame) and the bayed cream podium (granite base, pilasters, banners, gold grilles, dark eave, roof terrace).
- New: the entrance pavilion with the red sign, the portal and canopy, the forecourt with steps and planters, and night lights (crown, prow lines, grilles, sign, aviation light, rooms) in `group`, tagged `userData.landmark='vincom'`.
- About 3.9k triangles in the shared buffer, plus about 2.1k light triangles.

## Left
- No tower plan drawing or exact podium height has been found.
- The side entrances on Hà Nội and Đống Đa (if any) and the basement ramps are not modelled.
- The crown details (sky bar, pool deck) are only suggested.
