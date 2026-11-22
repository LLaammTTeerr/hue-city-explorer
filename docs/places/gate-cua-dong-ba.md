# Cửa Đông Ba (Chánh Đông Môn), `gate:Cửa Đông Ba`

Model: `src/landmarks/places/gate-cua-dong-ba.js`. The old generic gate in `citadel.js` is skipped by the shared
`replaced('gate:' + name)` guard in the gates loop (no per-gate line added).

## Sources
- https://special.vietnamplus.vn/2021/12/08/13_cong_kinh_thanh_hue/: east side, end of Mai Thúc Loan; arch 1809
  (Gia Long), vọng lâu 1824 (Minh Mạng); named after the Đông Hoa fort; fighting 5 July 1885; tower destroyed in 1968.
- https://suckhoedoisong.vn/dieu-it-biet-ve-loat-13-cua-ra-vao-di-tich-kinh-thanh-hue-169240310204253508.htm: fully
  restored in 2009; main gates about 17.4 m high, two-storey vọng lâu over the arch.
- https://nghiencuulichsu.com/2015/09/26/cong-cuoc-xay-dung-kinh-thanh-hue/: 10 main gates, three storeys, about
  16 m high; Chánh Đông got its tower in 1824.
- https://huetourism.gov.vn/CONG-CUA-TRONG-KIEN-TRUC-CUNG-DINH-HUE.html/?pid=MTk3ODB8Y3NkbGRs0 (after Phan Thuận An):
  nguyệt môn passage 3.82 m wide × 5.19 m high; two lim leaves banded with iron; stone name tablet 2.31 × 1.10 × 0.15 m;
  two-storey vọng lâu more than 9 m above the wall, tube-tile roofs, gate over 17 m in all.
- OSM gate building (way 695810694), 16.8 m along the wall × 13.0 m, axis from `geo/gates.js`. Moved in
  `scripts/build-data.mjs` (`GATE_FIX`) by 4.2 m east, 6.8 m north: OSM draws it about 7.4 m inside the wall and a
  little south-east along it, while Google's z19/z20 satellite puts the block's outer face on the rampart's outer face
  and Street View (2024 panos on the Mai Thúc Loan bridge) puts the arch on the bridge and road axis. The block centre
  is now about 16.47756 N, 107.58379 E. The record is also lengthened 7.8 m inward (`reach`) because the mapped
  rampart runs further into the city here than the real one; the slot the walls cut then reaches the street, and the
  record covers the passage out to the gateposts on Xuân 68 (where the carriageway narrows between them).
- The mapped band's city side is cut back (`GATE_FIX` `notch`: 12.5 m inside the outer face, 18 m either side of the
  axis). OSM ran it on as a 7 m vertical face to Xuân 68; Street View from Xuân 68 and from Mai Thúc Loan shows a brick
  retaining wall about 4 m high, hedge on top, capped stone gateposts at the passage and the bank rising behind, with
  the gate and its tower standing clear above. The model draws that wall, posts and bank in the notch.
- Street View (Google, viewed for reference only, nothing copied): the facade and tower read against the 3.82 m arch.

## Confirmed and used
Arch 3.82 × 5.19 m; tablet 2.31 × 1.10 m; two-storey tower; total height about 16.5 m (8.2 m block + tower), inside
the 16-17 m the sources give.

## Estimated
- From Street View, scaled from the arch: block top about 8.3 m above the road (1.6 m above the wall walk); near-black
  weathered brick; wide projecting corner pilasters with capitals; the arch, its ring and jambs in the same brick inside
  a recessed rectangular panel about 6.4 m wide and 6 m high (a proud brick frame and moulded head), the tablet just
  above it; a curved cornice stepped out in four courses; a low solid parapet with posts and corner finials (not
  crenellated).
- Tower, from the same panos: brick masonry with its render mostly gone, no colonnade. Lower storey about 9.6 m wide,
  3.4 m high on a 0.2 m plinth, its front 1.8 m behind the block's outer face, so about 3 m of wall shows over the
  parapet from the bridge; a central arch (about 2.2 m) and two small low arches (1.3 m) on the front, an arch and two
  round grilled windows to the city; a thin, shallow tile skirt; a terrace
  with a low balustrade; upper storey about 4.2 m wide, 2.2 m high, one arched window a side, a low hipped roof and a
  finial. About 16.5 m to the finial. Depths (6.2 m and 3.4 m) are guesses: no pano shows the side squarely.
- Roofs thin and shallow, weathered grey-ochre tile, no corner horns, small curled ornaments at the corners (Street View).
- Tablet text drawn as 正東門 (Chánh Đông Môn); not confirmed from a photo of the tablet.
- The block is 11.3 m deep from the outer face (satellite z20); behind it the passage runs between the notch's cheeks.

## Not drawn here
The moat bridge in front is the mapped road bridge (shared bridge code); the wall, moat and bastions are `kinhthanh`.
No night lights added.

## Left to do
Check the tablet text against a photo of the tablet. The mapped rampart (`kinhthanh`) here stands about 5.6 m inside
the real outer face and runs further in on the city side, so the gate block stands proud of the model wall; fixing
that belongs to the wall data, not this gate. The tower's depth needs a side view.
