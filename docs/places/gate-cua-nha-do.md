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
  inside a raised brick frame (6.4 × 6.2 m, 0.35 m proud, its piers running from the ground) under a grey lime lintel.
- The name tablet between the frame and the cornice, on each face: grey stone set flush in the brick with a thin pale
  border, three dark characters drawn as strokes.
- Weathering: a damp foot, grey streaks, relaid patches.
- A dark grey weathered-lime cornice at 8.0 m and a low panelled balustrade (0.6 m, posts 0.74 m) with recessed panels
  and capped posts, not crenellations.
- The brick takes the rampart's own colour (`kinhthanh.js`): in the photographs the block and the wall either side are
  the same weathered red-brown brick.
- The vọng lâu is masonry, lime-plastered:
  - lower storey 9.6 × 7.0 m, 4.2 m high, three brick-ringed arches front and back (2.3 m central, 1.5 m sides),
    one on each end;
  - a shallow tiled skirt (0.7 m rise, 0.3 m overhang) round a flat deck with a balustrade;
  - an upper storey 4.6 × 3.6 m with one arch on each long face;
  - a small shallow tiled hip roof, and a flagstaff; ridge about 17 m over the ground;
  - both roofs are straight hips of pale yellow-grey tiles with a thin light eave and no dark soffit, white hip ridges
    and only a small curled end at each corner (drawn in the place file, not `hip()`'s đầu đao horns, which are much
    larger than the real ones).

## Estimates
- All heights and the tower's size are photogrammetric estimates from the matched causeway photographs (scaled from
  the 17.7 m OSM width); the tower's depth is not visible from the street and is estimated.
- The sibling gates' documented "about 16 m in all" (`docs/heights-reference.json`) is a little lower than this
  gate's estimated 17 m ridge; no height is recorded for this gate.
- I found no source on how closely the post-1953 rebuild follows the original.

## Known differences (shared code, not this file)
- The rampart either side reads as high as the block's cornice from the causeway. Measured on the near car pano
  (scale from the 4.0 m passage): real wall top about 6.1 m over the ground, cornice 8.2 m. The model's wall is
  `WALL_H` 6.6 m plus `kinhthanh.js`'s estimated 1.1 m outer parapet = 7.7 m, against the block's 8.0 m cornice.
- The Nguyễn Trãi bridge is about 16 m wide in the model against about 4.3 m (one lane between stone parapets), and its
  paving runs to the gate where the real approach crosses a grass berm.
- From Ông Ích Khiêm the rampart's inner face is one sheer brick wall at the kerb; the photographs show a low retaining
  wall with the rampart stepping back in grassed tiers, and short wing walls with capped piers at the passage.
- The model sits about 2.3 m west-south-west of the gate along the wall in both car panos (inside tolerance). The OSM
  outline, the gate node, the road and the bridge all agree with each other, so the block is not moved on its own.

## Left out
- The bridge stays with the generic bridge code (`bridges.js`, 'Cầu Nhà Đồ' rise 1.0); it is a modern road bridge.
- No night lights: the existing gate loop lit only Cửa Ngăn and Cửa Thượng Tứ.
