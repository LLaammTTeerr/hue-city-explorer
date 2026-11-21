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
- The arch measures 3.82 × 5.19 m and the plaque 2.31 × 1.10 m.
- The two-storey vọng lâu has tubular-tile roofs. The model is about 17.2 m to the top ridge, and gate block and tower together rise about 10.6 m over the wall top. It is not in `docs/heights-reference.json`. `npm run check` passes at 24/24.
- The plaque reads 西北門 (Tây Bắc Môn), right to left. This follows the official naming of the ten gates (Chánh Nam Môn, Quảng Đức Môn …). It is drawn as a small canvas texture, in the browser only.

## Estimated
- The block stands 1.45 m above the wall walk. It is weathered lime-rendered brick, darker and mossier than the south gates since it faces north-west. It has a damp plinth band, corner pilasters and pilasters framing the arch bay. The arch has a light surround and keystone. A two-step cornice runs under a crenellated parapet.
- The door leaves stand open against the passage sides.
- The vọng lâu (the shared `pavilion()` from citadel.js) is 12.2 × 7.6 m on a stone sill. Its lower storey is colonnaded and its small upper storey closed. The timber is red lacquer and both roofs are yellow glazed tile. These colours follow the other Kinh thành gates' photographs, not a written source for An Hòa.
- Photographs of An Hòa itself were not found in a fetchable source. The form follows the common description of the ten land gates.

## Changed from the generic gate
- The arch is now the sourced size. The facade has pilasters, a cornice, a damp band, moss streaks, a keystone and open iron-banded doors. The plaque is the sourced size and carries readable characters.
- The roofs are yellow glazed, not ochre. The tower is centred between the two wall faces.
- The model's ground is marked paved, so trees and houses keep off it.

## Left as it is
- Cầu An Hòa is drawn by the shared bridge code from data.bridges. It is a modern road bridge and is not redrawn here.
- The wall, the moat and any ramps beside the gate belong to `kinhthanh`.
- No night lighting: no source says how the gate is lit.
