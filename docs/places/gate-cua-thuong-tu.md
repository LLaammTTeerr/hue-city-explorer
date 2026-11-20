# Cửa Thượng Tứ (Đông Nam Môn), south-east gate of the Kinh thành

Model: `src/landmarks/places/gate-cua-thuong-tu.js`, id `gate:Cửa Thượng Tứ`. The Citadel gates loop in
`src/landmarks/citadel.js` skips it through the shared `replaced('gate:' + name)` guard on the integration branch.

## Sources
- tapchidongnama.vn, "Các loại hình cổng cửa trong kiến trúc cung đình Huế" (after Phan Thuận An):
  https://tapchidongnama.vn/cac-loai-hinh-cong-cua-trong-kien-truc-cung-dinh-hue/
- VietnamPlus, "Khám phá kiến trúc 13 cửa thành của Kinh đô Huế": https://special.vietnamplus.vn/2021/12/08/13_cong_kinh_thanh_hue/
- nghiencuulichsu.com, "Công cuộc xây dựng Kinh thành Huế": https://nghiencuulichsu.com/2015/09/26/cong-cuoc-xay-dung-kinh-thanh-hue/
- OpenStreetMap: gate outline way 173614468 (`historic=city_gate`, `name:zh=東南門`); bridge way 1431132257
  (Cầu Cửa Thượng Tứ); Đinh Tiên Hoàng through the gate as `tunnel=building_passage` (way 1184930852). Read from the
  local `data/raw/hue-osm.json` (the Overpass API could not be reached from this machine).
- `docs/heights-reference.json`: 16-17 m with the vọng lâu (already sourced; kept).

## Confirmed
- The arch was built in 1809 (Gia Long) and the vọng lâu in 1829 (Minh Mạng). It is the south-east gate, named after the Viện Thượng Tứ
  (the royal stables) inside it. Traffic runs one way into the Citadel. (VietnamPlus; nghiencuulichsu)
- The ten land gates share one form: a single arched passage (vòm cuốn) 3.82 m wide and 5.19 m high, and lim-wood leaves with iron
  bands on wheels. Over the arch is a đá thanh name tablet, 2.31 × 1.10 × 0.15 m. On top is a two-storey vọng lâu under
  tubular tiles, rising more than 9 m above the wall, over 17 m in all. (tapchidongnama)
- The outline is 18.8 m along the wall and 14.8 m through it. Its inner face is the mapped wall band's edge, opening on a notch
  about 9 m wide and 4.9 m deep. The wall's outer face lies 1.6 m beyond the outline. (OSM, `data.wall`)

## Estimated
- Block top at 0.4 m above the wall walk (7.0 m), parapet 0.75 m solid plus 0.6 m merlons. The block is 0.3 m proud of the wall's outer face.
- Vọng lâu: a 11.4 × 7.4 m column line on a 0.25 m platform; the lower storey 3.3 m. It has an open red-lacquered colonnade, a
  closed upper storey and two tiers of weathered yellow tiles with a gourd on the ridge. The plan, the tile colour and the
  storey heights are taken from photos, not measured. The model's top reads 16.7 m above the ground (reference 16-17 m).
- The tablet text is drawn as three glyph blocks for 東南門 (the official name, per OSM `name:zh`). The exact tablet
  inscription was not confirmed.
- Colours: rendered brick weathered grey-black with a damp foot; dressed-stone plinth and arch surround.

## What changed
- Replaced the generic Citadel gate (a flat block with a crenellated top and the shared pavilion) with this model:
  - a block sized to the OSM outline and the mapped wall face;
  - the sourced arch and tablet sizes, a stone surround and a keystone;
  - door leaves standing open in the passage;
  - a crenellated parapet with a solid base;
  - a taller two-tier vọng lâu reaching the sourced total height.
- Night lights are kept: the lower eave strip and a lantern at each mouth of the passage.
- Paved range registered so trees and houses keep off.

## Left / not drawn here
- Rampart, moat and the bridge are drawn by `kinhthanh.js` and `bridges.js`, and are unchanged.
- The tablet inscription and the vọng lâu's exact bays and tile colour are still to confirm. A photo survey or the
  Huế Monuments Conservation Centre records would settle them.
