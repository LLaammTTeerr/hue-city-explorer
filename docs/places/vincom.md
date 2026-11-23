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
- Podium heights: granite storey 10.2 m, cream bays to 23.2 m, dark eave to 26.2 m (read from the Hà Nội car panoramas against the 2.5 m eye height).
- Tower plan: a pentagon over the north-west of the lot, about 635 m². West face about 20 m, north end about 12 m (pale bronze cladding), chamfer towards the roundabout, east face about 21 m, long glass south-west face. Its axis follows the lot's north front (4.5° off due east). Placed from the satellite (vertical edges at x ≈ 546 and ≈ 572) and two car panoramas on Hà Nội; matched to within about 1–2 m and 2°.
- Grey stone base block under the tower, from the street to 30 m on the west flank, with two high window strips and a louvred plant storey to about 38.5 m.
- Meliá Vinpearl entrance: the west 24.6 m of the Hà Nội front. A granite bay to 15 m, three tall glazed bays, a dark canopy at about 5.5 m with the hotel's name on it.
- The Vincom entrance pavilion on the NE front, the bay rhythm, the banners and colours, the forecourt and the lit-room scatter are all estimates.

## Changed (vs the old civic.js model)
- The old model had a 46 × 25 m box tower on a plain 23 m prism. It is replaced by the V-plan glass tower (mullions, dark ends, prow, crown frame) and the bayed cream podium (granite base, pilasters, banners, gold grilles, dark eave, roof terrace).
- New: the entrance pavilion with the red sign, the portal and canopy, the forecourt with steps and planters, and night lights (crown, prow lines, grilles, sign, aviation light, rooms) in `group`, tagged `userData.landmark='vincom'`.
- About 3.9k triangles in the shared buffer, plus about 2.1k light triangles.

## Changed (rebuild from satellite and Street View, 2026-11)
- The tower moved 15–20 m west and turned about 23°: from a V plan at the lot centre to the pentagon over the NW corner. The podium is taller (eave 23.6 m to 26.2 m). Added the grey base block, the louvre storey and the Meliá entrance. The west flank has no shop bays. Granite is lighter, grilles are grey.
- Disagreements (kept for the owner): the 2024 photos read as a V plan with its prow NE; the capture notes call the west flank "cream with ribs" where the car panorama shows grey stone; the satellite's oblique west edge looks about 33 m long against about 20 m from Street View.

## Changed (review fixes, 2026-11)
- The base block and louvres are neutral grey. The Meliá bay is speckled beige-gold granite with dark glazed doors, a central entrance with steps, pale grey-green glass with mullions above, and a cream three-bay storey that ends in a thin cornice with roof planting. The lettering reads the right way round.
- The tower's north end is a narrow tan strip (about 8.6 m) with floor bands, beside blue-grey glass.
- The NW yard is cleared in `scripts/build-data.mjs` (`keepClear`: infill and trees are dropped when written, so the rest of the city keeps its shared dice). It holds paving, the basement ramp with its canopy, a plant house and four palms.
- The SW flank is blank, with stepped pilasters. The south corner on Đống Đa has one canopied door with steps. The podium bays carry chevron lattice panels, and the bays on the left of the north front carry poster banners.

## Left
- No tower plan drawing or exact podium height has been found.
- A side entrance on Hà Nội, if there is one, is not modelled.
- The Meliá lettering is a simple stroke font and reads only from close up.
- The crown details (sky bar, pool deck) are only suggested.
