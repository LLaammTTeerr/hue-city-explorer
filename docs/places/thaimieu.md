# Thái Miếu (`thaimieu`)

Model: `src/landmarks/places/thaimieu.js`. Before this, only the generic mapped buildings stood here: the 1972
hall as an 8 m block, and the side halls and gates as plain boxes. The replica removes the mapped outlines inside its
compound wall from `data.bld`, and the mapped trees on its bases and halls from `data.trees`, before `populate` runs.

## Sources
- Báo Văn hóa, 24 Oct 2024, "Di tích Thái Miếu, Đại Nội Huế sẽ được trùng tu như thế nào?":
  https://baovanhoa.vn/van-hoa/di-tich-thai-mieu-dai-noi-hue-se-duoc-trung-tu-nhu-the-nao-109477.html
  - built 1804 (Gia Long), destroyed 1947; a smaller hall rebuilt 1971-72 on the old base; precinct > 14,900 m2.
  - Thái Tổ Miếu 71 x 27 m (1,917 m2), trùng thiềm điệp ốc: tiền điện 15 gian 2 chái, chính điện 13 gian 2 chái.
  - foundation traces of Tả / Hữu Tùng tự, Mục Tư điện, Thổ Công từ, Tuy Thành Các.
  - gates Diên Hy, Quang Hy, Túc Tướng, Hiển Thừa and the walls restored in phase 1.
- Báo Văn hóa, 6 Dec 2025, "Nơi thờ các chúa Nguyễn đang được trùng tu như thế nào?":
  https://baovanhoa.vn/van-hoa/noi-tho-cac-chua-nguyen-dang-duoc-trung-tu-nhu-the-nao-186138.html
  - the 1972 hall was dismantled for the project; foundation, bình phong and Tuy Thành Các done.
- Báo Văn hóa, 3 Aug 2026, "Thái Tổ Miếu sẽ được phục hồi với kinh phí hơn 220 tỉ đồng":
  https://baovanhoa.vn/van-hoa/thai-to-mieu-se-duoc-phuc-hoi-voi-kinh-phi-hon-220-ti-dong-252917.html
  - main hall: foundation only; bình phong 99 %, Hiển Thừa / Túc Tướng 99 %, walls 93 %; phase 1 ends 2026.
    Phase 2 (timber hall, yellow glazed tiles) from 2027: "ngói âm dương tráng men vàng", timber "sơn son
    thếp vàng" (red lacquer and gilt), group II wood; no heights, column counts or roof form given.
- VnExpress, "Trùng tu nơi thờ 9 chúa Nguyễn": https://vnexpress.net/trung-tu-noi-tho-9-chua-nguyen-4268751.html
- OpenStreetMap (data/raw extract): hall 172657566, walls 695810745 / 695810746 / 1346838355, Miếu Môn 619851652,
  Tuy Thành Các 695810747, Quang Hy 619851650, Diên Hy 619851651, Chiêu Kính 619851653, Long Đức 239445969,
  Thổ Công Từ 239445950, Thần Khố 619851654, Thần Trù 695810748.

## Drawing rule
The project draws places that are being, or will be, rebuilt as the finished historic buildings. The model shows
Thái Miếu as before 1947: the double hall standing on its base, and Mục Tư điện, Thổ Công từ and the Tả / Hữu Tùng
tự standing on theirs. (In 2026 the main hall is a restored bare foundation and the four others are bases only.)

## Confirmed
- Main hall 71 x 27 m (1,917 m2), trùng thiềm điệp ốc: front hall 15 bays + 2 wings, main hall 13 + 2.
- Yellow glazed tiles and red lacquer with gilding (the phase 2 restoration brief, Báo Văn hóa 3 Aug 2026).
- Outlines and positions of the walls, gates and side buildings (OSM); yellow glazed roofs.

## Estimated
- Foundation height 1.0 m, its exact position (centred on the 1972 hall), 5 steps, three front flights plus end
  flights; column spacing (4.2 m bays, 2.9 m wing spans, 68.8 m between the outer columns).
- The hall drawn in Thế Miếu's idiom, the same type and use and the one of the pair still standing (no pre-1947
  drawings or heights of Thái Miếu found): both halls the same width, the main hall's 13 + 2 taken as double wings
  (as Thế Miếu's 9 + 2); verandah of 18 red columns before 15 bays of door panels with gilt transoms, walled wing
  bays, brick back and end walls, doors in the 5 middle bays at the back; two hip roofs joined at a valley with a
  bronze gutter; pháp lam sun discs and enamel panels on the ridges, dragon-tail finials on the main ridge.
- Heights from Thế Miếu (27.7 m deep against 27 m): main ridge 10 m over the floor (11 m over the ground; the
  `TRUE_H` 10 in build-data.mjs), front ridge 6.9 m, eaves 3.6 m (front) and 4.6 m (main). New entry for
  heights-reference.json proposed in scratch/heights-thaimieu.json (not yet merged): 11-13.5 m, the top of the ridge disc.
- Mục Tư điện as a mirror of Chiêu Kính; Thổ Công từ, Tả and Hữu Tùng tự as small colonnaded halls under single
  yellow glazed hip roofs, each sized to its restored base (9 x 12 m and 8.6 x 13 m with their terraces).
- Tuy Thành Các as a two-storey gate pavilion; Thái Miếu Môn as a three-door gate with a raised middle roof.
- A cross wall through Tuy Thành Các joining Quang Hy and Diên Hy Môn (not in OSM).
- Bình phong position (inside the front gate); Hiển Thừa / Túc Tướng Môn in the back cross wall at u = +-40.
- Tùng tự positions either side of the court; Mục Tư position mirrored from Chiêu Kính.
- Thần Khố / Thần Trù as plain tiled halls; Long Đức and Chiêu Kính heights (~6-6.5 m).
- Two small unnamed mapped buildings in the compound are left out (taken as site sheds).

## Left to do
- Check gate, Tuy Thành Các and bình phong forms and positions against photos; real foundation height and steps.
- Check the hall (bays, roof heights, ridge ornament, whether the main hall had a double roof) against pre-1947
  photos and the phase 2 design drawings when published.
