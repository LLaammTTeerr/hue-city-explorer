# Cửa Kẻ Trài (Đông Bắc môn), Kinh thành Huế

Model: `src/landmarks/places/gate-cua-ke-trai.js` (id `gate:Cửa Kẻ Trài`). The generic gate loop in
`src/landmarks/citadel.js` skips it through the shared `replaced('gate:' + name)` guard.

## Sources
- Tiền Phong, "Huế chính thức mở lại cổng thành cổ sau hơn 100 năm đóng kín":
  https://tienphong.vn/hue-chinh-thuc-mo-lai-cong-thanh-co-sau-hon-100-nam-dong-kin-post1847518.html
- Báo Văn hóa, "Cửa cuối cùng vào Kinh thành Huế thông tuyến sau hơn 1 thế kỷ":
  https://baovanhoa.vn/doi-song/cua-cuoi-cung-vao-kinh-thanh-hue-thong-tuyen-sau-hon-1-the-ky-232367.html
- Tuổi Trẻ / PLO, "Mở lại 1 cửa Kinh thành Huế sau hơn 1 thế kỷ":
  https://tuoitre.vn/plo/mo-lai-1-cua-kinh-thanh-hue-sau-hon-1-the-ky-post910744.html
- Tạp chí Đông Nam Á, "Các loại hình cổng cửa trong kiến trúc cung đình Huế" (the form shared by the land gates):
  https://tapchidongnama.vn/cac-loai-hinh-cong-cua-trong-kien-truc-cung-dinh-hue/
- Người Hà Nội, "Độc đáo kiến trúc, tên gọi các cửa ra vào Kinh thành Huế":
  https://nguoihanoi.vn/doc-dao-kien-truc-ten-goi-cac-cua-ra-vao-kinh-thanh-hue-83571.html
- Vietnamese Wikipedia, Kinh thành Huế: https://vi.wikipedia.org/wiki/Kinh_thành_Huế
- OpenStreetMap, from the repo's cached extract `data/raw/hue-osm.json`. The gate is way 1568259450
  (historic=city_gate, man_made=tower). The passage is way 1568259411 (tunnel=building_passage). Cầu Cửa Trài is way
  172905790.

## Confirmed
- Formal name Đông Bắc môn, the north-east gate. It stands on the west bank of the Đông Ba river near Mang Cá. The
  name comes from the Kẻ Trài hamlet and market outside the gate.
- The arch was built in 1809 and the vọng lâu in 1824. With Đông Ba it was one of the first two gates to get a tower.
- After 1885 the French walled Mang Cá and the gate was nearly shut. It reopened fully to traffic on 30 May 2026.
  The railing of Cầu Cửa Trài is damaged and awaiting repair.
- All the land gates share one form:
  - an arched passage 3.82 m wide and 5.19 m high, with two wooden door leaves;
  - a stone name tablet 2.31 × 1.10 m over the arch;
  - a two-storey vọng lâu more than 9 m above the wall top, with tube-tile roofs;
  - more than 17 m high in all.
- The wall is 6.6 m high (`WALL_H`).
- The OSM outline gives the gate block as 19.4 m along the wall and 18.9 m through it. Along the passage axis the
  rampart band measures ±9.4 m.

## Estimates
- Block top: 1.0 m above the wall walk, with a crenellated brick parapet.
- Tower plan: 11.2 × 7.4 m (column line, as at the sibling gates Nhà Đồ and Thượng Tứ), eaves 1.1 m, on a 0.35 m
  stone stylobate. Before Nov 2026 it was 12.4 × 8.2 m with 1.3 m eaves; the satellite shows the roofs narrower than that. Its ridge stands about 17.4 m above ground and about
  9.8 m above the wall top.
- Colours were not confirmed for Kẻ Trài. I found no usable photo description. They are assumed:
  - brick weathered dark, like the rampart;
  - roofs of yellow glazed tiles (weathered);
  - columns in red-brown lacquer;
  - a bluish-grey stone tablet with three light glyph blocks for 東北門.
- The door leaves are drawn standing open.

## What changed
- The gate now has its own model:
  - the true arch size;
  - the block sized to the OSM outline and reaching both rampart faces;
  - stone arch surrounds and the sized name tablet on both faces;
  - the parapet;
  - a taller two-storey tower matching the >9 m / >17 m figures.
- Before, the generic citadel.js gate drew a 4.2 × 5.4 m arch and a shorter tower.

## Satellite check (Nov 2026)
- Google satellite (z19/z20) against the model's matched top view: the block and the passage's ground-level ends sit
  within about 1.5 m of the OSM centre, and the passage bearing (about 55° from north, along the Cửa Trài road) is
  within about 2° of the model. The tower top reads 3-5 m north-west in the imagery; that is the camera's lean on a
  17 m tower, so the anchor was kept.
- From above, the tower roofs read a greyish tan, not bright yellow, and the block top a warm brownish grey. The roof
  colour was weathered to match; the tiles are still taken to be yellow glazed.
- Street View returned no usable frames here, so the faces, the bays and the upper storey are still unchecked.

## Left
- The tower's real colours, the bay count of the lower storey, and the form of the upper storey all need checking
  against a photo.
- Cầu Cửa Trài (55 m) is left to the shared road and bridge code. Its damaged railing is not modelled.
