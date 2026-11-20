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
- The temple faces SE toward the half-moon pond (OSM axis, bearing about 145°).
- The temple wall is 3 m high and 0.55 m thick, 262 m round (modelled as 79 × 52 m). It has gates on all four sides: Cung Môn in front, arched gates with cast tile roofs on the other three.
- Cung Môn has 3 bays and 2 storeys. Fifteen steps with dragon cheeks lead out in front of it and three steps down behind it.
- Ngưng Hy has three joined houses on a 25 × 24 m base, with yellow-glazed roofs. Its ridge is 8.4 m above the ground; the reference range is 8–9 m and the check passes.
- Front side halls: Công Nghĩa đường and Minh Ân viện, placed from OSM. Rear side halls: Tả/Hữu tòng viện.
- The tomb faces east. The Bửu Thành has three square walls: outer 25 × 25 m, 1.6 m high; middle 0.5 m high; inner 3.4 m high. Each has one front gate. A screen stands behind the outer gate. The grave is a stone house, 4.2 × 2.6 m.
- The stele house is 10.5 m square (OSM). It is grey rendered concrete with arched doors, a cornice, a two-tier slate roof and the stele inside.

## Estimated
- Court levels come from the terrain:
  - Temple: three terraces stepping down toward the gate.
  - Tomb: the stele court, then the Bái Đình in three 10 m levels down the slope east of it.
- Several sizes and places are estimated:
  - Hall heights and roof pitches; the places of the rear halls and the side gates.
  - The sizes of the middle and inner Bửu Thành walls.
  - The trụ biểu height (7.5 m).
  - Statue count: 8 mandarins, 1 horse and 1 elephant a side.
- A lawn layer covers the open precinct between the temple, the pond and the tomb. It keeps village houses out; the lanes and the pond are left open. Its extent is estimated.
- The family grave plots ('h' items) and the two small outbuildings are drawn simply from their OSM outlines.

## What changed
- The replica replaces the old generic `dongKhanh()` in tombs.js. It adds terraced courts, three joined hall roofs, a two-storey Cung Môn with its stair, all four gates, a slate-roofed Bi Đình with trụ biểu, the three-level statue court, and the triple-walled Bửu Thành with its screen and stone grave. It is about 16.8k triangles.

## What is left
- The pháp lam (glazed enamel) ridge decoration, roof finials, and the dragon carving on the stair cheeks.
- Pine trees in the precinct: the lawn layer counts as paved, so populate keeps trees off it.
- The half-moon pond is drawn by the water layer from the OSM outline, which is a rough polygon rather than a clean crescent.
