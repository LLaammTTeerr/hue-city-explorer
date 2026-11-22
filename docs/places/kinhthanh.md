# Kinh thành Huế: the Citadel rampart

Model: `src/landmarks/places/kinhthanh.js` (id `kinhthanh`). `src/geo/city.js` `buildWalls` skips the main wall band
(`data.wall[0]`) when this replica is present. It still draws the other `data.wall` pieces (Trấn Bình Đài / Mang Cá),
which belong to other places.

## Sources
- https://vi.wikipedia.org/wiki/Kinh_thành_Huế: about 10 km round, 6.6 m high, 21 m thick, zigzag plan. Earth at first, brick-faced from the end of Gia Long's reign. 24 bastions (5 a side, 4 at the corners), earth fill faced inside and out with gạch vồ. Hộ Thành Hà over 7 km long.
- https://nghiencuulichsu.com/2015/09/26/cong-cuoc-xay-dung-kinh-thanh-hue/: perimeter 9,949 m (nearly 11 km with Trấn Bình Đài). Earth core, inner and outer faces of brick. A moat 22.8 m wide and 4 m deep, with a 10 m path between the moat and the wall. Hộ Thành Hà about 250 m beyond, 35 m wide, 7 km long. 24 bastions from 1818, each with a powder magazine. Embrasures: 3 on each flank and 5 on each face of a bastion.
- Plan: OSM relation 8541343 (the mapped wall band, already in `data.wall`), which follows the bastions on both edges.

## Confirmed and modelled
- Height 6.6 m to the wall walk (`WALL_H`), band about 21 m, plan and bastions as mapped. Brick on both faces, grassed earth walk on top (trees on it come from the foliage pass; the band is kept out of the landmark cover).
- Embrasures: 5 on each bastion face and 3 on each flank. Outer edges under 120 m count as bastion faces or flanks, 60 m and under as flanks. Curtains run 130-240 m.
- Gate slots are cut exactly as city.js cuts them (`gateAxis`, `CITADEL_PASSAGE.slot`). The slot sides are left plain for the gate models.

## Estimates
- Parapet (nữ tường): 1.1 m above the walk, 1.4 m thick, on the outer edge only. Embrasures 0.9 m wide, with a 0.45 m sill.
- Weathering colours (near-black damp foot, lichen and soot streaks, lighter relaid patches) are judged from photos, not measured.

## Not changed / left
- Moat (22.8 m) and the path beside it: left as the mapped water and ground, which already read right in plan, except the west face, which OSM lacks; the build draws it (width choice in `gate-cua-chanh-tay.md`).
- Ngự Hà: mapped water, not changed.
- Not modelled: powder magazines in the bastions, the ramps up to the walk (mã đạo), and the moat's stone revetment. No source gave their positions or sizes.
- Not mine: the gates, Kỳ Đài, Trấn Bình Đài / Mang Cá, Đông Thành Thủy Quan.
- About 22k triangles added.
