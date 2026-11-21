# Cầu Gia Hội (`giahoi`)

Model: `src/landmarks/places/giahoi.js` (new). Guard: `src/geo/city.js` `buildRoads` skips the two bridge-road slabs inside the mapped outline when `replaced('giahoi')`. The deck profile (1.1 m crown, `geo/bridges.js`) is unchanged, so traffic and lamp posts in `life.js` still ride the deck.

## Sources
- OpenStreetMap (fetched Nov 2026 via the 0.6 API; Overpass refused the request):
  - way 1431132258, `man_made=bridge`, `layer=1`: the outline, about 57 m long and 21 m wide.
  - ways 482781198 and 631854507, `highway=tertiary`, `bridge=yes`, `oneway=yes`, `surface=asphalt`, `name:zh=嘉會橋`: two one-way carriageways about 9.5 m apart, centre to centre.
- huengaynay.vn, Khu phố cổ Huế – cầu Gia Hội: https://huengaynay.vn/du-lich/di-san-van-hoa/khu-pho-co-hue-cau-gia-hoi-258.html
  - The first bridge was wooden. It was rebuilt in stone under Thành Thái in 1904, 67 thước long.
  - Minh Mạng named it Gia Hội in 1837; before that it was An Hội.
- vi.wikipedia, Sông Đông Ba: https://vi.wikipedia.org/wiki/S%C3%B4ng_%C4%90%C3%B4ng_Ba
- kienthuc.net.vn (post486354):
  - Three bridges were built over the canal in 1808.
  - The Gia Hội and Đông Ba bridges have since been rebuilt, so today's bridge is a modern rebuild, not the 1904 stone bridge.
- nguoidothi.net.vn, Dấu xưa Gia Hội: https://nguoidothi.net.vn/dau-xua-gia-hoi-25412.html
  - The bridge joins Trần Hưng Đạo (Phú Hòa) to Chi Lăng (Phú Cát).
- Wikimedia Commons: the API was rate-limited, so no usable photo or caption of today's bridge was found.

## Confirmed
- Position, axis, overall length (about 57 m) and width (about 21 m), from the OSM outline.
- Two separate one-way asphalt carriageways.
- It is a modern rebuild over a canal about 45 m wide at the axis (from `data.land`). On the market (west) side the deck runs on over the bank as an approach.

## Estimated
- Structure: a low reinforced-concrete girder bridge with three spans of about 15 m. It stands on two wall piers with rounded cutwaters and stone-faced abutments at the banks.
- Cross-section:
  - 2 × 7 m carriageways;
  - a 2 m raised median;
  - 1.8 m raised footways;
  - a soffit 0.72 m below the deck, with four girders per span.
- Balustrade: concrete, off-white (#e7e2d6). Posts are about 2.2 m apart, with top and lower rails, and newel posts at the ends, over the abutments and over the piers.
- Lamps: only the generic street lamp posts from `life.js`. No special bridge lighting is known.

## What changed
- Before, there were two plain grey road slabs from `city.js`. Now there is a single 21 m bridge with:
  - footways, a median and edge lines;
  - an edge fascia and girder band;
  - a soffit and girders;
  - two piers with cutwaters and a tide mark;
  - abutments;
  - balustrades on both sides.

## What is left
- Check against a photo of today's bridge: the span count, pier form, railing pattern and colour, and whether it has decorative lamps.
- On the west approach a tree from `populate` stands on the deck. That deck is under 0.7 m above the ground, so the cover test there does not keep trees off. This happened before this change too.
- The balustrade runs about 20 m over land on the west side, because the OSM bridge ways extend that far.
