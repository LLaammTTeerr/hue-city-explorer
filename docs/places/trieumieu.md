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
  22 × 13.4 m.
- Low walls of about 1.2 m, one gate per side. Source: vi.wikipedia. The precinct ring from the OSM walls encloses
  5,461 m², against 5,410 m² given for the site by baophapluat.vn.
- Thần Khố stands to the east and Thần Trù to the west. Their positions are from OSM.
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
- Thần Khố and Thần Trù: small yellow-roofed halls with a verandah on low bases. Form and tile colour are not
  confirmed.
- Wall colour: ochre under a glazed coping (a lowered `FENCE.imperial`).

## Left
- The wall to Thái Miếu (OSM 1346838355) is shared. If the `thaimieu` replica also draws it, one of the two should
  drop it.
- `populate` keeps trees only off tall cover, so a tree can still stand on the low paved court. A shared change in
  `city.js` would be needed to keep them off.
- Interior altars and the porcelain relief on the gables are not modelled.
