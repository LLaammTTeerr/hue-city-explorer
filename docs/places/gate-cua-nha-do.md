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
- A brick block the full depth of the rampart: 14.7 m through the wall × 17.7 m along it.
- One round-arched passage, 4.2 × 5.4 m. It uses `CITADEL_PASSAGE`, so it matches the slot that `kinhthanh.js` cuts.
- A lime-plaster surround and keystone on each mouth.
- A framed name panel with three characters on each face.
- Weathering as on the rampart: a damp foot, streaks and relaid patches.
- A terrace 0.8 m above the walk, with a cornice and a crenellated parapet.
- A vọng lâu built with the shared `pavilion()`:
  - two storeys, with an open colonnade lacquered red;
  - two tiers of yellow-glazed roof;
  - a fire pearl with curls at the ends of the ridge.
- The ridge stands about 16.4 m above the ground.

## Estimates
- These have no measured drawings and follow the sibling gates and the gate convention in `citadel.js`:
  - the vọng lâu footprint (11.2 × 7.4 m);
  - the roof colour;
  - the terrace and parapet heights;
  - the size of the name panel.
- I found no source on how closely the post-1953 rebuild follows the original.

## Left out
- The bridge stays with the generic bridge code (`bridges.js`, 'Cầu Nhà Đồ' rise 1.0); it is a modern road bridge.
- No night lights: the existing gate loop lit only Cửa Ngăn and Cửa Thượng Tứ.
