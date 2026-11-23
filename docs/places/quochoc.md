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

## Rebuild against the satellite and Street View (2026-11)
The model was checked against Google satellite tiles (z18–z20) and car panoramas on Nguyễn Trường Tộ, Phan Bội
Châu and Ngô Quyền, plus one user panorama at the gate. These were used as visual reference only and are not stored
in the repository. Changes:
- **Lê Lợi frontage.** The wall and gate now stand 3.4 m further back from the street, square to Lê Lợi. The OSM
  wall line runs along the kerb side of the pavement and the planted verge. The satellite places the gate roof
  within about 1 m of the new position. The side walls keep their OSM line.
- **Wall.** A red wall about 1.75 m high, with a band of white square lattice panels framed in red. It has a cream
  coping, a low iron railing of single bars, and capped piers about every 7 m. This matches all three car panoramas.
- **Old hall (OSM relation 9669095).** The relation was drawn as one roofed mass with its courtyards covered over.
  It is now three hipped single-storey blocks across the width, joined along both long sides by low covered
  corridors, with the two courts paved, as the satellite shows. The block height (ridge about 6 m) is an estimate.
- **Hội trường.** The model had three separate hips. It now has one main roof, centred about 5 m north-west of the
  OSM outline's middle, which is where the satellite shows it. It keeps the 13 m survey height. A low veranda runs
  along the south-east side and there is a cream balustraded terrace at the north-east end.
- **Block 695775626.** Its walls are now 1915-style, with arched upper windows (Street View, Phan Bội Châu).
- **Sports ground.** Added from the satellite: the swimming pool (basin about 23 × 13.7 m, on a deck), the
  football pitch (about 76 × 39 m), and the red running track along its north-west side.
- Still not modelled:
  - the hội trường's south-west end, which the satellite suggests is a gable with a pediment (the model has a hip);
  - the pediment on the north-west gable of 695775626;
  - the tennis and basketball courts.

## Review fixes (2026-11)

- Gable ends with pediments (Street View: Phan Bội Châu, Nguyễn Trường Tộ, Ngô Quyền; satellite for the hội trường's
  SW end): 695775626 NW end, 695770487 SE end, 695775628 the end facing the pitch, 695775639 SW end. The roof runs
  out to the gable wall; the pediment has a cream foot and raking cornices, a cream inner triangle and a lozenge.
- Two storeys: the walls are plain render with the windows drawn per storey (arcade and shuttered arched windows on
  the 1915 blocks, framed rectangles on the later ones). The shared façade shaders' 3.4 m floors read as three.
- The small pavilion west of the pitch (about x −602, z 1077): 6.5 m square, two storeys of 3.6 m, red with cream
  bands and a flat ornamental parapet. Height estimated from Street View (no published figure).
- Grandstand 695775623: grey concrete tiers facing the track, not a building.
- Tennis court (satellite, east of the pitch) and basketball court (SW end of the pitch), sizes from the satellite.
- The drive and the circle's ring follow the ground in short draped strips (the old single quads stepped).
- The street railing is thin iron bars (`barW`, `railW`, `railH` in enclosure.js); more trees in the grounds.
- Dãy A and the laboratory block's SE ends were left at the OSM outline: the longer look in the imagery is roof lean.
