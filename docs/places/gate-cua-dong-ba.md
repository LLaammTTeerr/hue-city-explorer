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
- OSM gate building as in `data.gates` (16.8 m along the wall × 13.0 m), axis from `geo/gates.js`.

## Confirmed and used
Arch 3.82 × 5.19 m; tablet 2.31 × 1.10 m; two-storey tower; total height about 16.5 m (8.2 m block + tower), inside
the 16-17 m the sources give.

## Estimated
- Block 1.6 m above the wall walk; render colour (weathered dark grey); pilasters, cornice, crenellated parapet.
- Tower plan (12 × 7.2 m colonnade), storey heights, red lacquer, yellow glazed tiles (form shared with the other
  Kinh thành gates; colour from photos, not a written source).
- Tablet text drawn as 正東門 (Chánh Đông Môn); not confirmed from a photo of the tablet.
- The block reaches both rampart faces, so the passage runs the wall's full thickness (as the old model did).

## Not drawn here
The moat bridge in front is the mapped road bridge (shared bridge code); the wall, moat and bastions are `kinhthanh`.
No night lights added.

## Left to do
Check the tablet text and the tower's bay count against a 2009-or-later photo; heights entry could be added to
`docs/heights-reference.json`.
