# Cửa Nhà Đồ (Chánh Nam môn), place `gate:Cửa Nhà Đồ`

Model: `src/landmarks/places/gate-cua-nha-do.js`. The Citadel gates loop in `citadel.js` skips this gate through the
generic `replaced('gate:' + name)` guard.

## Sources
- OSM way 617748935 (`historic=city_gate`, `alt_name=Chánh Nam Môn`, `name:zh=正南門`):
  - outline 17.7 × 12.5 m;
  - centre at (-1428.75, 535.6) m in the model frame;
  - long axis at -0.473 rad.
- OSM way 1344778484 (`man_made=bridge`, `bridge:structure=beam`, "Cầu Nhà Đồ") is the moat bridge.
- OSM way 360777601 is Nguyễn Trãi, which runs one way through the passage. All three OSM ways were read from
  `data/raw/hue-osm.json`.
- https://vi.wikipedia.org/wiki/Kinh_thành_Huế gives the official name, Cửa Chính (Chánh) Nam. The popular name
  comes from the Gia Long-era Võ khố (arsenal).
- https://nguoihanoi.vn/doc-dao-kien-truc-ten-goi-cac-cua-ra-vao-kinh-thanh-hue-83571.html:
  - the arches date from 1809 and the vọng lâu from 1824–1831;
  - Cửa Chánh Nam collapsed in the 1953 flood and was later rebuilt;
  - it now carries one-way traffic on Nguyễn Trãi.
- https://vnexpress.net/dau-tich-13-cua-kinh-thanh-hue-xua-4300476.html says the name comes from the royal
  storehouse and workshop (Đồ gia).
- `docs/heights-reference.json`, sibling gates Quảng Đức and Thượng Tứ: about 16 m in all, with the tower rising
  more than 9 m above the wall top.
- `data.wall` at this gate:
  - the rampart's outer face is 8.1 m out from the centre;
  - the inner face is 6.3 m in, inside a notch about 9 m wide at the gate;
  - elsewhere the wall is 20 m thick.

## Model
- Rebuilt from street-level photographs taken from the causeway (matched views; Google Street View used only as a
  visual reference, nothing copied). Plan, centre and axis checked against the satellite: within about 2 m and 1°,
  so the OSM outline is kept.
- A bare red-brown brick block the full depth of the rampart: 14.7 m through the wall × 17.7 m along it, with shallow
  corner pilasters under lime capitals.
- One round-arched passage, 4.0 m wide with its crown at 4.8 m (the photographs show it narrower and lower than the
  shared `CITADEL_PASSAGE`, 4.2 × 5.4 m; the rampart slot is unchanged). Brick voussoirs, no plaster surround,
  inside a raised brick frame (6.4 × 6.2 m) under a grey lime lintel.
- The name panel (three characters) between the frame and the cornice, on each face.
- Weathering: a damp foot, grey streaks, relaid patches.
- A grey lime cornice at 8.0 m and a low plastered parapet (0.8 m) with recessed panels and capped posts, not
  crenellations.
- The vọng lâu is masonry, lime-plastered:
  - lower storey 9.6 × 7.0 m, 4.2 m high, three brick-ringed arches front and back (2.3 m central, 1.5 m sides),
    one on each end;
  - a tiled skirt round a flat deck with a balustrade;
  - an upper storey 4.6 × 3.6 m with one arch on each long face;
  - a small tiled hip roof with lime ridges and upturned horns, and a flagstaff; ridge about 17 m over the ground.

## Estimates
- All heights and the tower's size are photogrammetric estimates from the matched causeway photographs (scaled from
  the 17.7 m OSM width); the tower's depth is not visible from the street and is estimated.
- The sibling gates' documented "about 16 m in all" (`docs/heights-reference.json`) is a little lower than this
  gate's estimated 17 m ridge; no height is recorded for this gate.
- I found no source on how closely the post-1953 rebuild follows the original.

## Left out
- The bridge stays with the generic bridge code (`bridges.js`, 'Cầu Nhà Đồ' rise 1.0); it is a modern road bridge.
- No night lights: the existing gate loop lit only Cửa Ngăn and Cửa Thượng Tứ.
