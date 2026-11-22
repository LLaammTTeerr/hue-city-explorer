# Duyệt Thị Đường (`duyetthi`)

Replica in `src/landmarks/places/duyetthi.js`. It covers the royal theatre in the south-east corner of the Forbidden Purple City, its paved yard and front walk, Duyệt Thị Môn and the yard wall either side of that gate.

## Sources
- https://vi.wikipedia.org/wiki/Duy%E1%BB%87t_Th%E1%BB%8B_%C4%91%C6%B0%E1%BB%9Dng_(Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF): history, areas, the 12 m ironwood columns, two storeys inside, the gallery to the palace, Ngự Y on its right and Thượng Thiện on its left.
- https://baophapluat.vn/nha-nhac-cung-dinh-hue-nhin-tu-nha-hat-duyet-thi-duong-tiep-theo-post128368.html: ironwood hall, glazed tiles, "bốn gian hai chái", 12 m high, two storeys, walled square yard.
- https://vietnamtourism.vn/en/index.php/tourism/items/454: restored to the original form, with a glazed tile roof and red-lacquered, gilded columns.
- https://localvietnam.com/hue/hue-royal-theatre/: two-storey ironwood building under a gently curved roof.
- OpenStreetMap: the hall (way 172657563), Duyệt Thị Môn (619851666), the yard walls (1570130373, 1570130266), and the neighbours Ngự Y (695949060), Thượng Thiện (695810763) and Tả Trường Lang (531031529). Outlines are hard-coded in model metres.
- Google satellite imagery (2026, zoom 17-20) and a user photosphere taken on the hall's axis about 40 m in front of the entrance (pano 16.47063, 107.57894, looking south-west). Visual reference only; nothing traced.
- City height survey: 12.0 m to the top (`public/data/hue.json`), which matches the 12 m the sources give.

## Confirmed
- Built in 1826 under Minh Mạng, repaired in 1829, and turned into a music school in 1962. Restored 1995–2002 and in use since 2003. The building covers 1,182 m² on an 11,740 m² site.
- A wide rectangular hall: 38.4 × 22.4 m (OSM roof outline), about 12 m high, with glazed tiles. It has two rows of 12 m lacquered columns and two storeys inside.
- It has four bays plus two end bays (gian/chái) along its length.
- It faces east-north-east along its long axis. With that front, Ngự Y is on its right and Thượng Thiện on its left, as the wiki says. The Tả Trường Lang gallery joins its back end, and the path through Duyệt Thị Môn leads to the front end.

- Satellite: the OSM outline sits within ~1.5 m of the roof seen from above (the model reads ~1.3 m south, partly roof lean in the image), with its long axis at ~53° against ~52° measured. The roof is a hipped skirt all round, ~5.6 m deep at the ends and sides, under a gabled upper roof ~27 m long between its gable ends and ~10 m across its eaves; the ridge runs out to the gables. The tiles read dark grey-brown, unlike the golden roofs of Nhật Thành Lâu and Thái Bình Lâu nearby.
- Photosphere (the front, on axis): yellow stucco walls with white pilasters, a grey frieze under the eave and a red-brown plinth; an open portico three openings wide between the middle pilasters, with two columns; a blue-framed square medallion window in each side bay; grey tiles; the lower roof rises straight to the front gable, whose tympanum is decorated; upturned horns at the skirt's corners. A paved forecourt with a bronze cauldron on the axis in front of a low hedge, and bronze figures either side.

## Estimated
- The heights: eave 4.6 m, upper eave 7.6 m, ridge 11.8 m (the sources' 12 m). Measured against the width in the photo, the front gable's apex stands nearer 9 m; the model keeps the sources' height (an open question for the owner).
- The 0.4 m plinth and the two front steps; the portico's 2 m depth.
- The side and back walls, which no capture shows: drawn like the front (stucco, pilasters at the bay lines, a medallion window per bay), with one back door where the gallery joins.
- The forecourt's extent (26 × 24 m), the cauldron and figures' places, and the form of Duyệt Thị Môn (one doorway under a hip roof).
- The gate the photo is taken through stands on the hall's axis north-east of the forecourt; it is not mapped and not drawn.

## Changed
- Before: the theatre was the generic extruded mapped building (12 m, kind 2).
- Now: a two-tier yellow glazed roof, red-lacquered timber walls with columns at the bay lines, gilt liên ba and a clerestory band, a stone platform with front steps, a paved yard, and Duyệt Thị Môn with its wall. The mapped building is dropped automatically by populate's cover test, so no `replaced()` guard was needed.

- Rebuild from Google references: the upper roof is now gabled (it was a hip over a 30 × 13.6 m clerestory) and narrower, and the skirt rises to meet it; walls are yellow stucco with pilasters, medallion windows and a frieze instead of red-lacquered panels; the front has an open portico; the tiles are grey-brown instead of yellow; the brick yard round the hall became a narrow stone apron, and the front walk a paved forecourt with a cauldron, hedge and two bronze figures.

## Left to do
- No night lights.
- The yard's other walls (towards Ngự Y and Thượng Thiện) and the medicinal-herb garden are not drawn.
- A data tree stands on the front walk.
