# Cửa Chánh Tây (gate:Cửa Chánh Tây)

The main west gate (正西門) of the Huế Citadel (Kinh thành), on Thái Phiên street. Model:
`src/landmarks/places/gate-cua-chanh-tay.js`. The generic Citadel gate in `src/landmarks/citadel.js` skips it through
the gates loop's shared guard `replaced('gate:' + name)`. The rampart, its slot for the gate and the moat stay with
`places/kinhthanh.js`; this file draws only the gate.

## Sources
- Wikimedia Commons, "File:Cổng Chánh Tây - panoramio.jpg" (photo of 1 May 2014), the outer face seen from below:
  https://commons.wikimedia.org/wiki/File:C%E1%BB%95ng_Ch%C3%A1nh_T%C3%A2y_-_panoramio.jpg
- VietnamPlus, "Khám phá kiến trúc 13 cửa thành của Kinh đô Huế":
  https://special.vietnamplus.vn/2021/12/08/13_cong_kinh_thanh_hue/ — on Thái Phiên; arch 1809 (Gia Long), vọng lâu
  1829; the vọng lâu destroyed in the 1968 fighting; "Nay cửa đã được tu sửa".
- VnExpress, "Dấu tích 13 cửa Kinh thành Huế xưa": https://vnexpress.net/dau-tich-13-cua-kinh-thanh-hue-xua-4300476.html
  — vọng lâu destroyed, since repaired and rebuilt; the gate reopened to traffic in 2004.
- Thanh Niên, "Kinh thành Huế có bao nhiêu cửa thành?": https://thanhnien.vn/kinh-thanh-hue-co-bao-nhieu-cua-thanh-1851072181.htm
- Tạp chí Sông Hương, "Cửa Sập, sập khi nào?": http://tapchisonghuong.com.vn/tap-chi/c283/n11856/Cua-Sap-sap-khi-nao.html
  — argues the arch and tower fell in the 1953 flood, not in 1968.
- vi.wikipedia "Kinh thành Huế": wall 6.6 m high, about 21 m thick (no detail on this gate).
- Footprint: `hue.json` `gates` (from OSM): centre (-2921.5, -633.0) m, 19.6 × 12.8 m, long axis along the wall.
  The rampart faces on the passage axis (from `data.wall`): outer at t = -8.15 m, inner at +9.5 m (+6.4 m at the
  gate's own notch). Overpass could not be reached from this session, so no newer OSM outline was fetched.
- `scripts/build-data.mjs`: the moat before this gate has been filled; the mapped bridge way crosses dry land.

## Confirmed (photo and articles)
- One round-arched passage through bare red-brown brick, the arch ringed in brick voussoirs; a grey cornice ledge over
  it and the grey stone tablet 正西門 above.
- A grey cornice and a parapet of recessed panels between posts round the gate's flat top.
- The vọng lâu is masonry (lime-plastered brick), two storeys: the lower with a large arched opening in the middle of
  the long face and a smaller brick-rimmed arch either side; the upper a small block with a bare-brick panel; each
  storey under a plaster cornice edged with a row of tiles and corner ornaments.
- No moat bridge today: the street runs on fill up to the arch.

## Estimated
- Heights: the block's flat top 8.0 m over the ground (about 1.4 m above the rampart), parapet 0.95 m; lower storey
  3.4 m on a 0.3 m plinth, upper storey 2.3 m; low tiled caps 0.55 / 0.7 m. Top about 16 m above the street.
- Tower plans 9.4 × 6.2 m and 4.8 × 3.4 m, centred on the OSM footprint; arch sizes on the tower (2.5 × 2.75 m
  middle, 1.5 × 1.95 m sides, 1.5 × 2.3 m on the ends).
- The passage keeps the shared `CITADEL_PASSAGE` (4.2 m wide, crown 5.4 m) so it matches the rampart's slot.
- The inner (city) face is drawn like the outer one (tablet and arch ring); no photo of it was found.
- Colours from the single photo: brick #74503f with darker streaks, grey plaster #8f8b80, cream plaster #d3ccb6,
  tiles #8e4f3a.

## What changed
- Before: the generic Citadel gate (grey brick block, crenellated parapet, a timber two-tier pavilion with golden
  roofs). Now: red-brown brick front with brick-ringed arch, ledge and name tablet, panelled grey parapet, and the
  masonry two-storey vọng lâu with arched openings and tile-edged cornices. About 5k triangles.

## Left
- A photo of the inner face and of the tower's ends, and the tower's measured size.
- A tree from the street planting stands just outside the outer arch (outside this place; left as it is).
