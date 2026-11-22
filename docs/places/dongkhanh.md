# Lăng Đồng Khánh (Tư Lăng)

Replica: `src/landmarks/places/dongkhanh.js` (id `dongkhanh`). The old builder in `src/landmarks/tombs.js` skips
the site through the scaffold's generic `replaced(id)` guard.

## Sources
- https://vi.wikipedia.org/wiki/L%C4%83ng_%C4%90%E1%BB%93ng_Kh%C3%A1nh: the layout of the temple and the tomb, and the sizes of the walls and the grave.
- https://khamphahue.com.vn: Bái Đình, Bi Đình and Bửu Thành built 1916–1923 under Khải Định, in cement and steel. The Bi Đình is neoclassical with a slate roof. The mandarins are brick and lime.
- https://mia.vn: a three-level court before the tomb, with rows of elephants, horses and mandarins in front of the stele house.
- vanhoanghean.vn (via search): two rendered-brick trụ biểu flank the stele house. laodong.vn (via search): the horses are cement.
- https://commons.wikimedia.org/wiki/Category:Tomb_of_Emperor_%C4%90%E1%BB%93ng_Kh%C3%A1nh: the precinct is 2.29 ha. Photos were used for the general look.
- OpenStreetMap ways, from the local extract `data/raw/hue-osm-south1.json`:
  - 264285407 Ngưng Hy, 264285403 Cung Môn, 264285404/405 the front side halls
  - 1473253253 the gate steps, 251679817 the half-moon pond
  - 627391948 the stele house, 1473256420/1473256419 the paths round the stele court and the Bửu Thành
  - node 4425212171, the tomb

## Confirmed and used
- Google satellite and Street View (looked at in 2026 with matched model views; nothing kept in the repo) set both
  zones' frames:
  - Temple: axis bearing 144.8° toward the half-moon pond (the side walls measure 142.8–144.2°). The wall is about
    72 × 56 m, from 22 m behind the hall's base to Cung Môn.
  - Tomb: centred on the middle of the Bửu Thành, scene (-2195.1, 4335.9), facing east 6.6° south through the stele
    house. The OSM paths had put it 3 m too far south and 2° too far north.
- The temple wall is grey render over a dark stone foot. It stands about 2.6 m over the ground outside, and the
  courts' retaining sides form its foot. It has gates on all four sides: Cung Môn in front, arched gates with cast
  tile roofs on the other three. The side gates are at s 22.8, where the satellite shows small gate roofs.
- Cung Môn has 3 bays and 2 storeys, with terracotta tile (Street View from the pond). Fifteen steps with dragon
  cheeks lead out in front of it and three steps down behind it.
- Ngưng Hy has three joined houses on a 25 × 24 m base, with yellow-glazed roofs reaching s 0.1–24.7 on the
  satellite. Its ridge is 8.6 m above the ground, inside the 8–9 m reference.
- A narrower annex with a grey roof stands behind the hall. It is on the satellite; its name is not documented.
- The side halls have dark grey tile roofs and stand where the satellite shows them:
  - front (Công Nghĩa đường, Minh Ân viện) at s 35.3, t ±18.2;
  - rear (Tả/Hữu tòng viện) at s -5.3, t ±19.6.
- The tomb has three courts, each a step lower than the one behind it (mia.vn's "three levels"):
  - the Bửu Thành (±12.5 m);
  - a pale paved front court, s 12.5–23;
  - the Bái Đình, s 23–35.5, with the statue rows along both sides;
  - the stele court, s 35.5–61.5, 32 m across.
  Nothing is built east of the stele court.
- The Bửu Thành has three square walls: outer 25 × 25 m and 1.6 m high, middle 0.5 m, inner 3.4 m. Each has one
  front gate. A screen stands behind the outer gate. The grave is a stone house, 4.2 × 2.6 m.
- The stele house (Street View from the east, a user photo; its position was not used) stands on a balustraded
  terrace at s 44 with steps east and west. It is a square pavilion of grey cement, about 7.2 m, with an arched door
  in a framed front, pilasters and panels. Above are a cornice with a low slate roof, an attic and a small top roof
  with a finial, about 9 m over the terrace. Two trụ biểu, about 10 m, stand either side at t ±9.

## Estimated
- Court levels come from the terrain:
  - Temple: three terraces stepping down toward the gate.
  - Tomb: three courts stepping down east.
- Several sizes and places are estimated:
  - Hall heights and roof pitches.
  - The sizes of the middle and inner Bửu Thành walls.
  - The heights of the stele house and the trụ biểu, from the photo.
- Statues: 6 mandarins, 1 horse and 1 elephant a side.
- The lane from the north meets the stele court at grade; the court is cut back there, at s 44.5–50.
- A lawn layer covers the open precinct between the temple, the pond and the tomb. It keeps village houses out; the lanes and the pond are left open. Its extent is estimated.
- The family grave plots ('h' items) and the two small outbuildings are drawn simply from their OSM outlines.

## What changed
- 2026 rebuild against the satellite:
  - Re-framed the tomb.
  - Shortened and widened the temple wall.
  - Moved the hall 3 m forward, the rear halls 6 m forward and the front halls 4 m back.
  - Added the annex.
  - Gave the side halls grey roofs and Cung Môn terracotta tile.
  - Replaced the three-level Bái Đình east of the stele court with the satellite's three courts west of it.
  - Rebuilt the stele house and trụ biểu from Street View.
  - Fixed a misplaced side-gate gap in the temple wall.
- The OSM footprint of Ngưng Hy (way 264285407) lies about 18 m WSW of the hall on the satellite.
  `check:heights` still measures over that footprint, so its reference entry was left alone.

## What is left
- The pháp lam (glazed enamel) ridge decoration, roof finials, and the dragon carving on the stair cheeks.
- Pine trees in the precinct: the lawn layer counts as paved, so populate keeps trees off it.
- The half-moon pond is drawn by the water layer from the OSM outline, which is a rough polygon rather than a clean crescent.
