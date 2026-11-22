# Hiển Lâm Các and the Nine Urns — `hienlam`

Model: `src/landmarks/places/hienlam.js`. The older `hienLam` in `src/landmarks/civic.js` is skipped with
`replaced('hienlam')`. The Thế Miếu walls (`templeWalls`) are a separate entry there and are not affected.

The place covers:
- Hiển Lâm Các itself.
- The cross wall it stands in, with the gate towers Tuấn Liệt Môn and Sùng Công Môn.
- The nine dynastic urns (Cửu Đỉnh) and their stone apron in Thế Miếu's court.
- The walk behind, from the back steps to Miếu Môn.

Thế Miếu, its court paving, the Tùng Tự shrines and Miếu Môn belong to `themieu`.

## Sources
- vi.wikipedia, Hiển Lâm Các: https://vi.wikipedia.org/wiki/Hi%E1%BB%83n_L%C3%A2m_C%C3%A1c
- vi.wikipedia, Cửu Đỉnh (nhà Nguyễn), whose dimension table cites *Huế - Xưa và Nay*:
  https://vi.wikipedia.org/wiki/C%E1%BB%ADu_%C4%90%E1%BB%89nh_(nh%C3%A0_Nguy%E1%BB%85n)
- Tiền Phong, Hiển Lâm Các: https://tienphong.vn/dia-oc/576300/Hien-Lam-Cac---Dinh-cao-nghe-thuat-kien-truc-Viet-tpov.html
- Nhân Dân, Cửu đỉnh: https://special.nhandan.vn/cuu-dinh-bach-khoa-thu-viet-nam-trieu-nguyen/index.html
- Wikiwand, Thế Tổ Miếu (bell and drum lofts over Tuấn Liệt, on the left, and Sùng Công, on the right, joined to the
  pavilion by brick walls): https://wikiwand.com/vi/Th%E1%BA%BF_T%E1%BB%95_Mi%E1%BA%BFu_(ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF)
- OpenStreetMap, from the project's `data/raw/hue-osm.json`:
  - Hiển Lâm Các: way 172657564.
  - Tuấn Liệt Môn: way 690841002. Sùng Công Môn: way 695810846.
  - Cross wall: ways 695810847–850.
  - Urn apron: area 695810817. Front steps: 695810820.
  - Two small masonry pieces: 695810821 and 695810822.

## Confirmed
- Built 1821–22 under Minh Mạng; last full restoration in 2001.
- Height 17 m (Tiền Phong, Google Arts & Culture). Wikipedia also says 13 m, which is the height of the four
  full-height columns.
- About 300 m² in plan. The OSM outline, base included, is 23.6 × 13.6 m.
- Entirely timber: 24 columns, with the 4 central ones running the full height.
- Three storeys of 5, 3 and 1 bays, with 12 roof slopes (3 hipped tiers).
- Base of vồ brick and lime, decorated with porcelain-shard reliefs, and paved with Bát Tràng brick.
- Two flights of 9 Thanh-stone steps, one at the front and one at the back. Each has dragon reliefs on its cheek
  walls and the king's way down the middle.
- The name board over the middle door has a green field and a gilt frame carved with nine dragons.
- A yellow gourd finial stands on the top.
- The urns:
  - They stand in one row in front of Hiển Lâm Các, facing Thế Miếu, each on stone.
  - Cao is in the middle, on the axis, and set forward (sources say about 3 m).
  - West of Cao, outward: Nhân, Anh, Thuần, Dụ. East of Cao, outward: Chương, Nghị, Tuyên, Huyền.
  - Heights are 2.25–2.50 m (Cao 2.50 m) and mouths about 1.37 m across.
  - Each has three legs and two upright loop handles.
- Positions of everything come from OSM. The cross wall runs flush with the pavilion's front face, so Hiển Lâm Các
  stands on the Miếu Môn side of the wall, and the urn apron lies in Thế Miếu's court.

## Estimated
- Storey heights:
  - Floor 1.35 m above the ground (9 steps of 0.15 m).
  - Ground storey 3.6 m, second 4.5 m, third 3.2 m.
  - Top roof 2.7 m and finial 1.25 m, about 16.6 m in all.
- Plan:
  - Column grid 20.0 × 10.2 m (6 × 4 columns).
  - The second storey (12.4 × 6.4 m) stands on the inner columns.
  - The third storey is 5.2 × 4.6 m.
  - The ground storey is drawn as an open verandah round a closed core, with door leaves and a gilt đố bản over
    them.
- The roof tiles are taken as yellow glazed tiles (PAL.imperialRoof). No source states the tile colour.
- Urn positions:
  - Spacing 4.6 m.
  - The row stands 3.4 m in front of the wall line. Cao stands 4.4 m further forward, toward the middle of its
    mapped bay; that is more than the 3 m the sources give.
  - The urn body profile and the stone slabs are estimates.
- Gate towers: each has a plastered gate body of the mapped size (13.9 × 4.0 m), 4 m high, with three doors (the
  middle one larger) between pilasters under one tiled roof. Over the middle door is a plastered loft with a railed
  balcony and a round opening on each face, under its own hip roof: about 9 m high in all. Door widths and the loft
  size are read from one Street View photosphere, not measured.
- The two small mapped pieces at the ends of the urn row: their purpose is unknown. They are drawn as stone stands
  with small bronze burners.
- The walk to Miếu Môn: Bát Tràng brick, 4.4 m wide, with a stone middle.
- The cross-wall height comes from `FENCE.imperial`.

## Google imagery check (Nov 2026)
Visual reference only; captures stay outside the repo.
- Satellite (Google, zoom 18-20): the OSM group (outline, steps, urn apron, gates) lay about 1-1.5 m east and 0.5 m
  south of where the imagery shows the back steps, the urns and the roof. The frame is re-centred 1.0 m west and
  0.4 m north; the axis (facade bearing about 53°) already matched.
- Street View: no Google car pano sees the pavilion. A user photosphere in Thế Miếu's court, looking south-west
  along the urns toward Sùng Công Môn, shows:
  - yellow-plastered end walls closing the ground-storey verandah at each end;
  - a red timber fretwork railing along the verandah edge, open over the steps;
  - lacquer dark and worn (oxblood, columns almost brown), now drawn darker than the shared `PAL.lacquer`;
  - the urns on stone slabs in a kerbed planted bed with low flowering shrubs, not on bare stone;
  - Sùng Công Môn as a plastered gate (three doors, one roof, plastered loft), drawn so for both gates.
- Not checkable from the imagery: storey heights, the third storey and the 17 m total.

## Left
- Interiors (the carved wooden stair, the altars) are not modelled. The urns' relief panels are too small to model.
- The stele pavilions: no source places stele houses in this court, so none are drawn.
