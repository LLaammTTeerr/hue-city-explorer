# Chùa Báo Quốc (id `baoquoc`)

Model: `src/landmarks/places/baoquoc.js`. It covers the pagoda precinct on Hàm Long hill as it stands in 2026: the stair and three-arch gate, the forecourt, the terrace, the main hall, the 口 ranges round the inner court, the rear hall, the side halls, the 19-stupa garden, the precinct wall and night lanterns. It uses about 15k triangles.

## Sources
- https://en.wikipedia.org/wiki/B%C3%A1o_Qu%E1%BB%91c_Temple
- https://vinwonders.com/vi/wonderpedia/news/chua-bao-quoc-hue/
- https://mia.vn/cam-nang-du-lich/van-canh-chua-bao-quoc-hue-16961
- Wikidata Q4857424; Wikimedia Commons category "Báo Quốc Temple, Huế" (July 2024 photos)
- OpenStreetMap ways:
  - 1170979640: precinct, amenity=monastery
  - 239977720: main hall
  - 239977717: comb-shaped range behind the hall
  - 239977719: rear hall
  - 239977718: small hall
  - 239977721: long range
  - 1483313963: service road to the gate

## Confirmed
- The site is about 2 ha on Hàm Long hill.
- A triple gate stands at the head of 15 stone steps.
- The halls form a 口: chánh điện in front, tăng xá and nhà khách at the sides, nhà hậu at the back.
- The main hall has 3 bays and 2 chái, a double roof (trùng thiềm), and four dragon-wrapped pillars.
- There are 19 patriarchs' stupas, multi-tier with lotus tops. Giác Phong's stupa (1714) is 3.30 m.
- The 2024 photos show:
  - a dark, moss-stained gate with a two-tier roof over its middle
  - red-tiled courts
  - a red-brick terrace with two stone lantern pillars and lions
  - brown-red tile roofs and ochre walls
- Footprints and orientation come from OSM. The precinct faces about north-east, toward Báo Quốc street.

## Estimated
- All heights. The main hall's ridge is about 7.9 m above its platform, matching the 8 m height table value.
- Gate size (11 × 3 m, about 7 m high), step rise (0.15 m), terrace level, forecourt slope and extent.
- Stupa garden location: placed on the visitor's left (east side of the forecourt), following en.wikipedia and vinwonders. Mia.vn puts the stupas "behind the temple", so this is not confirmed.
- Stupa sizes and layout, and which one is the founder's (given a low surround).
- Lantern positions and the wall's form (a low dark moss-capped wall on the OSM outline).

## What changed
- The mapped hall and ranges are replaced by the model. city.js drops them under its cover, so there is no `replaced()` guard.
- Generated filler houses inside the OSM precinct are removed, as quochoc.js does. Trees are left.
- The forecourt, terrace, hall platform and inner court are marked paved.

## Left to do
- The Hàm Long well (north, at the foot of the hill), the bell tower and the Buddhist school buildings are not modelled.
- Interior and mosaic (mảnh sành) detail, and the exact ridge ornaments, are left out.
- Check the stupa garden's position against a site plan or aerial photo.
