# Cửa An Hòa (gate:Cửa An Hòa)

Model: `src/landmarks/places/gate-cua-an-hoa.js`. The gates loop in `src/landmarks/citadel.js` skips it through its generic `replaced('gate:' + name)` guard, so this branch adds no guard line of its own.

## Sources
- VietnamPlus, "Khám phá kiến trúc 13 cửa thành của Kinh đô Huế": https://special.vietnamplus.vn/2021/12/08/13_cong_kinh_thanh_hue/
  - Also called Tây Bắc Môn. It stands at the north-west corner and links đường Nguyễn Trãi to đường Tăng Bạt Hổ.
  - The arched gate was built in 1809 under Gia Long, the vọng lâu in 1831 under Minh Mạng.
  - The name comes from An Hòa village and market in front of it.
- VietnamNet, "Magnificent beauty of Hue imperial city's gates": https://vietnamnet.vn/en/magnificent-beauty-of-hue-imperial-citys-gates-798789.html (location only).
- huetourism.gov.vn, "Cổng cửa trong kiến trúc cung đình Huế" (after Phan Thuận An): https://huetourism.gov.vn/CONG-CUA-TRONG-KIEN-TRUC-CUNG-DINH-HUE.html
  - These figures apply to all ten land gates of the Kinh thành:
    - an arched passage 3.82 m wide and 5.19 m high, with lim-wood door leaves bound with iron;
    - a stone name plaque about 2.31 × 1.10 × 0.15 m over the arch;
    - a two-storey vọng lâu of the "tam quan – cổ lâu" form, roofed with tubular tiles (ngói ống), rising more than 9 m above the wall top;
    - more than 17 m high in all.
- vi.wikipedia.org, Kinh thành Huế: the rampart is 6.6 m high. The northern stretch of the moat is the An Hòa river.
- OpenStreetMap, read from data/raw/hue-osm.json:
  - the gate building, way 367959065 (`historic=city_gate`, `name=Cửa An Hòa`): 17.5 × 13.9 m, which is the footprint in `data.gates`;
  - Nguyễn Trãi's passage through the gate, way 39418370 (layer -1);
  - Cầu An Hòa over the moat, way 39412997 / man_made=bridge 1431136604: about 60 m long, on the gate's axis.
- Also searched, with nothing specific to this gate's present form or any restoration: Wikimedia Commons, Tuổi Trẻ (2025 plan to open up public space in front of eight gates, An Hòa among them), Người Hà Nội, and news on the 2025 floods.

## Confirmed
- The plan, centre and axis come from OSM. The rampart's faces on the axis (data.wall) lie 9.1 m outside and 6.9 m inside the gate's centre. The block reaches 0.4 m past both.
- The satellite agrees with the axis: Cầu An Hòa runs at 324.5° against the model's outward 323.3°. Street-level panoramas taken from cars on the bridge, Nguyễn Trãi and Lương Ngọc Quyền put the gate front within about 2.5 m of the model's, which is inside their own error. The satellite roof sits 5-8 m north, but that is the tower leaning in the oblique image. The centre is left at OSM.
- The arch measures 3.82 × 5.19 m and the plaque 2.31 × 1.10 m. Both come from huetourism.gov.vn, which gives the same figures for all ten land gates.
- The source says the whole gate is more than 17 m high and the vọng lâu rises more than 9 m over the wall top. The model reaches about 19 m to the ridge: 9 m to the block's cornice, about 10 m for the tower. It is not in `docs/heights-reference.json`, because the source gives only lower bounds.
- The plaque reads 西北門 (Tây Bắc Môn), right to left, dark on a pale stone field, as the photographs show. It is drawn as a small canvas texture, in the browser only.

## From the street-level photographs (2025)
- The block is dark mottled brick with patches of lime render and lichen. Its ends step out as broad corner piers. The arch sits in a framed panel up to rampart height under a moulded band. The plaque is above the band, then a two-step cornice. A plain parapet with corner posts runs round the top; there are no crenellations.
- The vọng lâu is masonry, not a timber colonnade. Its lower storey is lime-rendered. Each long face has three arched openings; the middle one is tall and wide, with a red-painted back. Each end has one opening. Above is a short terracotta tile skirt with small upturned corners, then a balustraded terrace.
- The upper storey has an arched window front and back and a round window in each end. Its low hipped roof is terracotta, with ridge ornaments and a lightning rod.
- Heights are scaled from the sourced arch. The tower depth is estimated, since no photo shows it square on.

## Estimated
- The door leaves stand open against the passage sides.
- Colours are matched to the photographs by eye.

## Changed in this rebuild
- The shared `pavilion()` (red lacquer, yellow glazed roofs) is replaced by the masonry tower the photographs show. The crenellations are replaced by a plain parapet, the light arch surround by the framed panel, and the dark plaque by a pale one. The block's top rose from 1.45 m to 2.4 m over the wall walk.
- Google's panorama "fov 80" behaves as a vertical field at 1400 × 900, about 105° horizontally. The comparison renders use fov 105.
- The model's ground is marked paved, so trees and houses keep off it.

## Left as it is
- Cầu An Hòa is drawn by the shared bridge code from data.bridges. The shared code humps it; the real bridge is flat.
- The wall, the moat and any ramps beside the gate belong to `kinhthanh`. The shared rampart's parapet stands about 1 m higher next to the gate than in the photographs.
- The postern pillars and gateposts along Lương Ngọc Quyền are not modelled.
- No night lighting: no source says how the gate is lit.
