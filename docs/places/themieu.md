# Thế Miếu (Thế Tổ Miếu) — `themieu`

Model: `src/landmarks/places/themieu.js`. The Thế Miếu wall and the wall between it and Hưng Miếu, previously drawn
by `templeWalls` in `src/landmarks/civic.js`, are skipped there once this place is built (`replaced('themieu')`).
`templeWalls` is now its own entry in `buildCivic`, not called from `hienLam`, so a guard on Hiển Lâm Các does not
drop the walls with it.

## Sources
- vi.wikipedia, Thế Tổ Miếu (hoàng thành Huế): https://vi.wikipedia.org/wiki/Th%E1%BA%BF_T%E1%BB%95_Mi%E1%BA%BFu_(ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF)
- en.wikipedia, Thế Miếu: https://en.wikipedia.org/wiki/Th%E1%BA%BF_Mi%E1%BA%BFu
- OpenStreetMap, via the project's `public/data/hue.json` (`bld`) and the wall ways already copied into civic.js:
  - hall: way 172657567
  - walls: 695810851 (compound wall) and 695810842 (dividing line)
  - mapped neighbours: Thổ Công Từ, Tả/Hữu Tùng Tự, and the gates Khải Địch, Sùng Thành, Hiển Hựu, Đốc Hựu and Miếu Môn
- mia.vn travel note (lime-washed brick walls): https://mia.vn/cam-nang-du-lich/co-gi-tai-the-mieu-17066

## Confirmed
- Footprint 54.60 × 27.70 m (about 1,500 m²). The base is nearly 1 m high. The OSM outline, base included, measures
  55.9 × 29.0 m. Source: vi.wikipedia.
- Trùng thiềm điệp ốc plan. The main hall has 9 bays and 2 double wings; the front hall has 11 bays and 2 single
  wings, joined to it by carved vì vỏ cua trusses. Source: vi.wikipedia.
- Roof of yellow glazed tiles (hoàng lưu ly), with a pháp lam ornament on the ridge. Source: vi.wikipedia.
- The court:
  - Bát Tràng brick paving.
  - 14 stone stools with potted plants, in one row.
  - A pair of bronze kỳ lân.
  - The nine urns at the far end (drawn by `hienlam`).
  - An old pine to the west of the hall.

  Source: vi.wikipedia.
- Thổ Công Từ and Canh Y Điện stand symmetrically to the west and east; Canh Y Điện is now a ruin. Tả and Hữu Tùng
  Tự stand outside the wall. Source: vi.wikipedia.
- Positions and orientation of every building and gate come from OSM. Checked against Google satellite (Nov 2026):
  the hall centre is within about 2 m and its axis within 1 degree (bearing 54 degrees); the court paving is the
  hall's length wide (56 m), lawn and trees either side. The hall faces south-east toward Hiển Lâm Các,
  about 58 m away on the axis.

## Estimated
- Heights. Main ridge 10.5 m above the floor (the existing `TRUE_H` value in build-data.mjs). Front-hall ridge
  6.9 m; eaves 3.6 m (front) and 4.6 m (main hall).
- The front hall is a single-tier hip; the main hall has double eaves: a tiled skirt round its back and both ends at
  the front hall's eave height (3.6 m over the floor), a short lacquered clerestory, and the upper hip set in 3 m,
  eave 6.0 m, ridge 10.5 m. The front/main hall split is at about 10/16 m of the depth. The skirt band on every side
  is read from Google satellite imagery (Nov 2026 alignment pass); the heights are estimates.
- Bay widths: 4.3 m for the bays, 2.65 m for the wing spans.
- Front facade: red lacquered door panels with a gilt transom, a verandah of 14 red columns, and walled wing bays.
  Brick walls lime-washed a pale ochre.
- Steps: three flights at the front and one at each end.
- Positions of the 14 stools and the kỳ lân. The pine's place and size.
- Thổ Công Từ is drawn as a small yellow-roofed hall with a verandah (faded yellow-brown on the satellite).
- Tả and Hữu Tùng Tự: the satellite shows each under two parallel roofs, ridges along the court's axis (a front and
  a rear house facing the axis), about 13 x 15 m over the eaves, in dark grey tile; drawn so. Whether the grey is
  the permanent tile or a restoration cover is not confirmed.
- Gates are drawn as small brick gates with a tiled hip roof; their form is not confirmed.
- Canh Y Điện: a base with a few column bases. Its mirror position across the axis is assumed.
- Ground: the compound is mapped as landuse=religious, which the city draws as bare sand. The satellite and the
  photospheres show lawn under dense shade trees, with only the court before the hall paved, so the place lays a
  lawn over Thế Miếu's side of the cross wall, narrow brick walks round the hall, along the court and out to the
  side gates (their exact line is estimated), and extra shade trees on the lawn. Hưng Miếu's court is left to its
  place.
- Tả and Hữu Tùng Tự bodies are lacquered timber panels, not brick.

## Left
- Wall height and colour are kept from `FENCE.imperial`.
- The OSM dividing wall stops at the two rear gates, and the model does too.
- Interior altars are not modelled.
- Hiển Lâm Các, its bell and drum towers, the cross wall with Tuấn Liệt / Sùng Công môn, and the nine urns belong to
  `hienlam`. Hưng Miếu, its gates, and the northern ring wall (TM_WALLS[2]) belong to `hungmieu` / civic.js.
