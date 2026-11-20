# Duyệt Thị Đường (`duyetthi`)

Replica in `src/landmarks/places/duyetthi.js`. It covers the royal theatre in the south-east corner of the Forbidden Purple City, its paved yard and front walk, Duyệt Thị Môn and the yard wall either side of that gate.

## Sources
- https://vi.wikipedia.org/wiki/Duy%E1%BB%87t_Th%E1%BB%8B_%C4%91%C6%B0%E1%BB%9Dng_(Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF): history, areas, the 12 m ironwood columns, two storeys inside, the gallery to the palace, Ngự Y on its right and Thượng Thiện on its left.
- https://baophapluat.vn/nha-nhac-cung-dinh-hue-nhin-tu-nha-hat-duyet-thi-duong-tiep-theo-post128368.html: ironwood hall, glazed tiles, "bốn gian hai chái", 12 m high, two storeys, walled square yard.
- https://vietnamtourism.vn/en/index.php/tourism/items/454: restored to the original form, with a glazed tile roof and red-lacquered, gilded columns.
- https://localvietnam.com/hue/hue-royal-theatre/: two-storey ironwood building under a gently curved roof.
- OpenStreetMap: the hall (way 172657563), Duyệt Thị Môn (619851666), the yard walls (1570130373, 1570130266), and the neighbours Ngự Y (695949060), Thượng Thiện (695810763) and Tả Trường Lang (531031529). Outlines are hard-coded in model metres.
- City height survey: 12.0 m to the top (`public/data/hue.json`), which matches the 12 m the sources give.

## Confirmed
- Built in 1826 under Minh Mạng, repaired in 1829, and turned into a music school in 1962. Restored 1995–2002 and in use since 2003. The building covers 1,182 m² on an 11,740 m² site.
- A wide rectangular hall: 38.4 × 22.4 m (OSM roof outline), about 12 m high, with yellow glazed tiles. It has two rows of 12 m lacquered columns and two storeys inside.
- It has four bays plus two end bays (gian/chái) along its length.
- It faces east-north-east along its long axis. With that front, Ngự Y is on its right and Thượng Thiện on its left, as the wiki says. The Tả Trường Lang gallery joins its back end, and the path through Duyệt Thị Môn leads to the front end.

## Estimated
- The two-tier roof: a skirt roof from a 4.6 m eave round the whole hall, a clerestory over the inner hall (30 × 13.6 m) from 5.9 to 7.6 m, and a ridge at 11.8 m with a pearl-and-dragons ornament.
- The 0.6 m stone platform and the front steps.
- The bay widths (end bays 5.6 m), the pattern of door leaves and gilt panels, the three front doors and the name board.
- The yard paving, its extent, and the form of the gate (one doorway under a yellow hip roof).
- I could not check the facing direction or the exterior colours against a photo. They come from the OSM layout, the wiki's left/right description, and the colours of the other Imperial City halls.

## Changed
- Before: the theatre was the generic extruded mapped building (12 m, kind 2).
- Now: a two-tier yellow glazed roof, red-lacquered timber walls with columns at the bay lines, gilt liên ba and a clerestory band, a stone platform with front steps, a paved yard, and Duyệt Thị Môn with its wall. The mapped building is dropped automatically by populate's cover test, so no `replaced()` guard was needed.

## Left to do
- No night lights.
- The yard's other walls (towards Ngự Y and Thượng Thiện) and the medicinal-herb garden are not drawn.
- A data tree stands on the front walk.
