# Chùa Thiên Mụ (id `thienmu`)

The model is in `src/landmarks/places/thienmu.js`. The old `buildThienMu` in `src/landmarks/citadel.js` now skips through a one-line `replaced('thienmu')` guard.

## Sources
- https://vi.wikipedia.org/wiki/Chùa_Thiên_Mụ
- https://en.wikipedia.org/wiki/Thiên_Mụ_Temple
- https://vietnamnet.vn/en/inside-hue-s-425-year-old-thien-mu-pagoda-home-to-two-national-treasures-2533392.html (the turtle stele and the bell, both national treasures)
- Search summaries citing tapchicongthuong.vn and vietnamplus.vn for the stele's dimensions
- crystalbay.com travel notes on the Tam Quan gate: two storeys, eight roof faces, brick walls, a wooden upper floor
- OpenStreetMap, from the local extract `data/raw/hue-osm-west.json`:
  - Tower: way 205795043, `height=21`
  - Precinct outline: way 205794912. This is the same ring as `data.hakhe`.
  - Tam Quan: way 1205452741
  - Square stele houses: ways 1494518276 and 205794914
  - Hexagonal pavilions: ways 1494518277 and 1494518278
  - Đại Hùng Bảo Điện: way 205794919
  - Guardian halls: ways 205794917 and 1195439754
  - Halls behind: ways 205794918, 205794921, 1205452747, 1195439753, 205794915 and 205794913
  - Stupa: way 206108046
  - Footways and steps: ways 1195439748 and 1195439749

## Confirmed
- **Phước Duyên tower:** 21 m tall, seven octagonal tiers. Built in 1844 under Thiệu Trị. A Buddha stands on each tier, and a spiral stair runs inside.
- **Hương Nguyện pavilion:** stood in front of the tower and collapsed in 1904. Only its base remains.
- **Square stele houses:** two of them flank the tower and hold Thiệu Trị's steles.
- **Hexagonal pavilions:** one holds the 1715 stele on a stone turtle. The other holds the 1710 bell: about 2.5 m high, 1.4 m across, 2–3 t.
- **Turtle stele:** the stele is 2.6 × 1.2 m according to vi.wikipedia; another source gives 3.89 × 1.68 × 0.25 m. The turtle is 2.24 × 1.65 × 0.66 m.
- **Tam Quan:** a two-storey gate with three entrances and guardian statues. Inside it, two halls hold six guardians each.
- **Behind the gate:** Đại Hùng Bảo Điện, then the Địa Tạng and Quan Âm halls, the monks' quarters, a pine garden and the abbots' stupas.
- **Approach:** four ceremonial pillars, and a brick stair down to the riverside road with a landing on the river.
- **Footprints and positions:** from OSM, as listed above.

## Estimated
- **Platform sizes:** the octagonal tower terrace (r 7.4 m, 0.9 m high, with a balustrade) and the tower's base radius (3.9 m).
- **Tower tiers:** the proportions of each tier, and the 2.5 m finial.
- **Tam Quan:** about 11.2 × 5.4 m. The lower storey is 4.4 m high and the upper storey 2.5 m; the total is about 11 m.
- **Đại Hùng Bảo Điện:** split into a 9 m front hall plus a 16 m double-roofed main hall. Wall heights are estimated, and the total is about 13 m. The ridge ornaments are simplified.
- **Bell and stele placement:** the bell is placed in the east hexagon and the stele in the west, following the "tả chung hữu cổ" convention.
- **Colours:** terracotta roofs, ochre walls, lacquered columns and the brick-red stair.
- **Wall:** the precinct wall is 2.3 m high with tiled coping. Along the front brow it is a 0.95 m lime balustrade.
- **Stair:** the model's terrace stands 9.9 m above the road, so the stair has 30 risers in two flights. Sources speak of about 19 steps; the terrain here is a model simplification.
- **River landing:** a platform plus 18 steps to the water.
- **Halls behind:** single-roofed halls on the OSM outlines. Their heights are estimated, and the very long service wings are capped at 14 m deep.
- **Stupa:** the 206108046 outline is drawn as an octagonal three-tier stupa. It may be Thích Đôn Hậu's stupa.

## What changed
- **Terrace:** the Hà Khê terrace is now cut at the front so the stair descends inside it between stone cheek walls, instead of running out across the road.
- **Tower:** set on a balustraded octagonal terrace with steps. It has doors on the axis, Buddha niches on the other faces, and a light ring under each eave at night.
- **New structures:**
  - The Hương Nguyện ruin
  - The four pillars, with lanterns
  - The square stele houses
  - The bell and turtle stele in their hexagonal pavilions
  - Tam Quan, with its three passages, twelve guardian figures and two-storey roof
  - The guardian halls
  - Đại Hùng with its platform and incense urn
  - The halls behind
  - Lawns, bonsai and paths in the court
  - The stupa
  - The precinct wall, with openings where the side-gate path crosses it
  - The river landing
- **Lighting:** all lights are in `group` with `userData.landmark = 'thienmu'`.
- **Surfaces:** the courts are in `S.paved`, and the terrace and lawns are in `S.noCover`.

## Left to do
- **Side gates:** the two unnamed side gates in `data.gates` are still drawn by `citadel.js` as generic imperial gates with green roofs. A better model would match the real gates.
- **Missing details:**
  - The interiors of Đại Hùng
  - The upper statues of Tam Quan (Nguyễn Hoàng and Thiên Mụ)
  - The Austin car shrine
  - The other abbots' stupas in the pine garden (only the one mapped stupa is drawn)
- **Toilets and shelter:** OSM ways 1205452748 and 1205452750 are not modelled.
