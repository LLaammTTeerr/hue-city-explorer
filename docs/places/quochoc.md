# Trường Quốc Học — `quochoc`

Model: `src/landmarks/places/quochoc.js`. The older gate and fence, `buildQuocHocGate` in `src/landmarks/more.js`,
now return early when this place is built (`replaced('quochoc')`). Out of scope: Bia Quốc Học across Lê Lợi.

## Sources
- Nguyễn Ngọc Tùng, Tôn Thất Hiếu Khoa, Hoàng Uyên Thư, "Vài nét về kiến trúc cổng Quốc Học Huế", Tạp chí Khoa
  học và Công nghệ, ĐH Khoa học Huế, 19(1), 2021:
  https://csdlkhoahoc.hueuni.edu.vn/data/2022/3/720_fulltext_9_Kien_truc_-_Tung_-_Nguyen_Ngoc_Tung.pdf
- happyvietnam.vnanet.vn, "Hue National School reflects enduring elegance of imperial city" (the gate).
- voh.com.vn, "Nhìn ngắm vẻ đẹp cổ kính của trường Quốc Học Huế" (colour, front wall, phượng, stairs).
- tienphong.vn, "Diện mạo Quốc Học Huế sau 130 năm" (the 1915 rebuild, corridors, bình phong, bell, statue,
  the 2025–26 renovation).
- vi.wikipedia, Trường Trung học phổ thông chuyên Quốc Học (area, site, statue).
- en.vietnamplus.vn, "Quoc Hoc Hue High School features Indochinese architecture".
- OpenStreetMap: campus way 695775622 (school, barrier=wall); buildings 118542427, 695770486, 695770487,
  695775623–626, 695775628–630, 695775634–641 and 1377968893; circle drive 835629406; service drive 828329033.
  Heights to the top come from hue.json `b[5]` (survey).

## Confirmed
- The campus is about 5.6 ha (vi.wikipedia). Outline taken from OSM.
- The blocks were rebuilt from 1915 in brick, lime and tile, with covered corridors (tienphong). They are painted the
  school's dark red, "đỏ sẫm" (voh). The facades are red with arched openings, corridors and tiled roofs (vietnamplus).
- Building outlines and heights come from OSM and the survey. Blocks of 8 m or more are drawn with two storeys.
- The gate (Tùng et al. 2021):
  - A tam quan, 9.1 m wide, 2.2 m deep and 7.3 m tall.
  - Eight concrete columns, 0.55 × 0.672 m.
  - A middle opening of 4.3 m with two iron leaves, and side doors of 1.2 m with one leaf each.
  - 2.4 m from the ground to the upper floor, and 1.5 m from that floor to the roof.
  - The vọng lâu has a balustrade, the name board and the bell.
  - Two roof tiers with ridge ornaments, including the mặt nguyệt.
- The gate is two storeys, with a wooden upper level and imperial-yellow glazed tiles (happyvietnam).
- A bình phong long mã with a stele stands inside the gate (tienphong).
- A statue of Nguyễn Tất Thành stands in the yard: white cement in 1989/90, later bronze (vi.wikipedia, tienphong).
  Its position, the middle of the OSM circle drive on the gate axis, is mapped.
- The yard has phượng (flamboyant) trees (voh).

## Estimates
- Roof colour of the blocks: weathered red-brown tile.
- Galleries:
  - Which side they are on: the long side facing the yard (the statue circle).
  - Which blocks have them: the colonial blocks at least 20 m long and 9 m deep.
  - Form: arches on both floors, depth 2.6 m inside the mapped outline, piers about every 3.4 m.
- Storey heights: split evenly under the eave.
- Roof rise: 0.24 × depth, between 1.6 and 4.2 m.
- Newer blocks (OSM, not colonial): drawn in the same red with plainer walls (KIND.CIVIC).
- Gate:
  - The roof tiers and the low side covers are proportioned to reach 7.3 m.
  - The chữ thọ panels are reduced to cream plaques.
- Bình phong and stele:
  - Position: on the axis, 11 m inside the gate.
  - Size: 4.6 × 0.6 × 2.7 m.
- Statue: a pedestal of about 3.2 m and a figure of about 2.9 m.
- Phượng trees (27): positions and sizes are illustrative, along the drive, round the circle and between the wings.
- Lamps: positions along the drive and at the gate are illustrative.

## Changes
- New replica: 19 campus buildings with cream cornices, plinths and string courses, and hip roofs. The arcaded
  two-storey galleries face the yard.
- New gate drawn to the paper's dimensions. It replaces the older 19 m-wide, 11 m-tall estimate in more.js.
- The campus wall and railing (`fence`, `FENCE.quochoc`) open 4.75 m each side of the gate. The fence has no lamps;
  the model's lights are its own glow points in `group` (`userData.landmark = 'quochoc'`).
- The yard gains the drive from the gate to the circle, the ring round the circle, a lawn, the statue on its
  pedestal, the bình phong long mã and stele, and lamp posts.
- At runtime, generated infill houses inside the campus ring are removed from `data.infill` (25 houses), with
  `meta.counts.infillNear` adjusted. 27 phượng trees (kind 2) are appended to `data.trees`.
- About 23,300 triangles.

## What is left
- Check against photographs:
  - roof tile colour;
  - gallery sides and the routes of the covered corridors between blocks;
  - the bình phong position;
  - the position and form of the stairs.
- The renovation of 2025–26 may have changed colours or details. Not checked.
- The gate's chữ thọ balustrade, its timber detail and the dragons on the ridge are simplified.
- The buildings have no interiors. The shader windows are generic colonial ones, with green louvres.
