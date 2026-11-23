# Triệu Miếu (Triệu Tổ miếu) — `trieumieu`

Model: `src/landmarks/places/trieumieu.js`. Before this, the place was only the mapped OSM building (way 172657570)
extruded to the `TRUE_H` height of 8 m in `scripts/build-data.mjs`; `populate` now drops that building because the
model covers it. No older builder drew the precinct, so no `replaced()` guard was needed.

## Sources
- vi.wikipedia, Triệu Miếu: https://vi.wikipedia.org/wiki/Tri%E1%BB%87u_Mi%E1%BA%BFu
- en.wikipedia, Triệu Tổ miếu: https://en.wikipedia.org/wiki/Tri%E1%BB%87u_T%E1%BB%95_mi%E1%BA%BFu
- vi.wikipedia, Hưng Miếu (the same plan; used for proportions and court furniture): https://vi.wikipedia.org/wiki/H%C6%B0ng_Mi%E1%BA%BFu
- huesmiletravel.com (bays, Thần Khố east / Thần Trù west): https://www.huesmiletravel.com/trieu-mieu-temple-trieu-to-mieu-hue-city
- baophapluat.vn, inauguration 2016 (site area 0.541 ha): https://baophapluat.vn/thua-thien-hue-khanh-thanh-di-tich-trieu-mieu-post226822.html
- en.vietnamplus.vn, restoration 2014-16: https://en.vietnamplus.vn/old-temple-in-hue-royal-citadel-rehabilitated/99084.vnp
- OpenStreetMap, from the API (map call on the bbox 107.5789,16.4692,107.5813,16.4712):
  - hall: way 172657570
  - walls: 695810745, 695810746 and 1346838355 (the wall shared with Thái Miếu's court)
  - gate nodes: 12458492679, 12458492677, 12458492684
  - Thần Khố: 619851654
  - Thần Trù: 695810748

## Confirmed
- Built in 1804. Trùng thiềm điệp ốc plan: a front hall of 5 bays and 2 single wings, and a main hall of 3 bays and 2
  wings, joined by a vì vỏ cua truss. Main hall about 540 m². Source: vi.wikipedia.
- The OSM outline measures 24.05 × 23.6 m (567 m², base included). It faces south-east, toward Thái Miếu.
- Yellow glazed yin-yang tiles. Ridges and gable walls carry raised work inlaid with porcelain. Woodwork is lacquered
  red with gilt motifs; the back of the main hall is stained wood-tone. Source: vi.wikipedia.
- Court of about 300 m², Bát Tràng brick. Source: vi.wikipedia. The model's court (hall front to the shared wall) is
  22 × 15.3 m.
- Walls of about 1.2 m, one gate per side, per vi.wikipedia; the street photo disagrees on the height (see Review fixes). The precinct ring from the OSM walls encloses
  5,461 m², against 5,410 m² given for the site by baophapluat.vn.
- Thần Khố stands to the east and Thần Trù to the west. Their positions are from OSM.

## Satellite alignment (Google, 2026 rebuild)
Google imagery was used only as a visual reference (captures kept outside the repo).
- The roof measures about 24.2 × 22.5 m. Its long eaves run on a bearing of 53-56°, the same as the OSM walls (55°).
  It sits about 1.9 m behind and 0.6 m north-east of the OSM hall outline. The court's row of planters, just in front
  of the steps, is about 2.5 m behind where the outline put it. The precinct walls, gates and side halls from OSM match
  the imagery, so only the hall and its court are re-framed in the place file (`C` = OSM centre `C0` moved). The column
  lines are at ±9.9 m (was ±10.4 m), so the roofs are 22.5 m deep. The base keeps the OSM size.
- Thần Trù has a hipped roof of brown, unglazed clay tiles with lime-white ridges and hips. Its ridge runs along its
  length (NW-SE), and the roof looks a little larger than the OSM outline.
- Thần Khố is a ruin: a bare platform with a grid of white column bases (about 4 × 6), a flight up its south-west long
  side, and a low kerb round it on the lawn. The model draws it like that, not as a roofed hall.
- The satellite shows the front part of the main roof's inner field as brown and the rest of the roof yellow. This
  model keeps the documented yellow glazed tiles everywhere (see Left).
- The street-level imagery near the place (Lê Trực side, outside the moat) does not show the hall.
- Restored from June 2014 to September 2016, with US AFCP funding. The model shows the restored, bright state.

## Estimated
- Heights. Base 0.7 m (Hưng Miếu's is 0.68 m). Main ridge 8.0 m above the floor (the existing `TRUE_H`). Front-hall
  ridge 5.6 m; eaves 3.0 m (front) and 4.0 m (main hall). The front/main split is at about 9/12 m of the depth.
- Bay widths, and the 8 verandah columns.
- Three front flights and one at each end.
- Ridge ornament: a gourd on a flame base, plus inlay panels. The real ridge motif is not confirmed.
- Six planters on stools and a bronze urn, borrowed from Hưng Miếu's court. The 2.15 m stone walk is also Hưng
  Miếu's figure.
- Gates: small brick gates with a yellow-tiled hip roof, at the three OSM gate nodes (two in the back wall, one in the
  wall to Thái Miếu). Wiki gives one gate per side; OSM maps none in the east wall, and the model follows OSM. The
  gate form is not confirmed.
- Thần Trù: a plain hall on a low base under a gable roof. Roof colour from the satellite; gable form and cream
  plaster from the west-corner street photo; heights (walls 2.6 m, roof rise 2.5 m) estimated.

## Left
- The wall to Thái Miếu (OSM 1346838355) is shared. If the `thaimieu` replica also draws it, one of the two should
  drop it.
- `populate` keeps trees only off tall cover, so a tree can still stand on the low paved court. A shared change in
  `city.js` would be needed to keep them off.
- Interior altars and the porcelain relief on the gables are not modelled.
- The brown patch on the satellite roof (the front part of the upper roof field) disagrees with the documented yellow
  glazed tiles. It may be weathered or older tiles; it needs a ground photo to settle.

## Review fixes (street photo at the west corner)
A user-uploaded Street View photosphere from the road junction by the precinct's west corner (pose estimated from
the image and the satellite, about 16.46997, 107.57944, looking east) is the only ground-level view of the place.
- Precinct wall: the photo shows a plain, weathered grey-ochre lime-plaster wall with a dark unglazed tile coping and
  no piers, about 3 m high (about six times the bench in front of it); only the tip of Thần Trù's roof and its cream
  gable show above it. The model follows the photo (`LOW` in the place file; `fence` now takes `postW: 0` for a wall
  with no posts). This disagrees with vi.wikipedia's 1.2 m: an owner question.
- Thần Trù: a gable end (cream plaster) under the brown clay roof faces the corner, so the hall is drawn with a
  gable roof and plastered walls instead of the hip-roofed red lacquer pavilion.
- Thần Khố platform re-measured on the z20 satellite: about 13.4 × 18.8 m, centre 2.4 m west and 1.9 m south of
  the earlier position.
- Court: pale grey-brown worn brick, as the satellite reads (was saturated red-brown).
- Grounds: nine large trees over the precinct's west half and the garden behind its back wall, and two hedged beds
  north-east of the hall beside the court, placed from the satellite.

## Owner questions
- Wall height: vi.wikipedia gives about 1.2 m; the street photo shows about 3 m. The model follows the photo.
- Hall roof colour: the satellite shows a brown field on the main roof inside a yellow surround; vi.wikipedia
  documents yellow glazed tiles throughout. The model keeps yellow.
