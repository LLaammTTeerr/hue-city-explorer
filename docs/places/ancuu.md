# Chợ An Cựu (`ancuu`)

Model: `src/landmarks/places/ancuu.js`. It draws the whole lot and removes the mapped outline (`Chợ An Cựu`, survey
height 11.5 m) from `data.bld`, so the city builder no longer draws it. No older builder needed a guard.

## Sources
- OSM way 118541113 (in `data/raw/hue-osm*.json`): amenity=marketplace, building=yes, address 89 Hùng Vương,
  subdistrict Phú Nhuận, open Mo-Su 08:00-18:00. Neighbouring ways: Hùng Vương 1160448443 and 1160448444 (west),
  Đặng Văn Ngữ 1102511392 (south), service lane 895581674 (north and east). The bridge over sông An Cựu is just to
  the south.
- GISHue drone survey (`data/raw/heights/gishue.*`): one footprint over the whole block, 12 m (11.5 m in hue.json).
- Google Open Buildings 2.5D 2023 (`data/raw/heights/open-buildings-2023.*`): about 10-11 m along Hùng Vương, 7-9 m
  over most of the block, a ridge of 13-14 m over the south-centre, and 4-6 m along the south edge.
- History and location (secondary tourism pages): founded in 1835 under Minh Mạng beside sông An Cựu, also called
  chợ Đường Ngang.
  - https://sovaba.travel/blog/bai-viet-cho-an-cuu-hue-cho-truyen-thong-nhon-nhip-voi-nhieu-mon-ngon-dan-da
  - https://vinwonders.com/vi/wonderpedia/news/pha-dao-am-thuc-cho-an-cuu/
  - https://hue.gov.vn/Visitor/Visitor-detail/tid/An-Cuu-market/newsid/986A546E-6444-4F64-90DE-AED000A7E2C6/cid/26A92FFB-9424-4EE6-BE8D-A380F108582C
    (puts it on the An Cựu river bank, at the corner of Phan Đình Phùng and Hùng Vương).

## Confirmed
- The outline of the lot, about 2,300 m², and the streets around it (OSM). Checked against satellite imagery:
  the outline sits within about 2 m, and its north edge runs at a bearing of about 77°.
- The overall height (survey) and how height is spread over the block (Open Buildings).

## Seen in imagery (satellite and street-level views, 2025; used as a visual reference only, nothing traced)
- **Perimeter block.** Two storeys of white render wrap the Hùng Vương front, the cut corner, the Đặng Văn Ngữ
  front and the first ten metres of the east lane, about 7 m deep. The ground floor is shop bays: jewellers
  (Duy Tấn, Hoàng Ngọc, Phương Nam) with red-and-gold counters, blue-and-white striped awnings, and a sign band
  up to about 5 m. The upper floor has breeze-block lattice panels between white piers, from about 5 to 9.3 m.
  A deep cantilevered roof slab, about 1.4 m out, sits at about 9.3-10.3 m, with a large billboard on the south roof.
- **The corner.** Where the cut front meets Đặng Văn Ngữ the corner is rounded, with stacked curved slabs and a
  tall white blade of about 15 m or more. Red letters reading "CHỢ AN CỰU" stand on a frame over the cut front,
  facing the junction.
- **The south-east corner.** The upper floor is painted periwinkle blue, with windows, for about 12 m along the
  south front and 10 m up the east side. The east wing further north is lower: shops and a gallery, about 6 m.
- **Inside the lot (satellite).** A square pyramid-roofed hall of about 16 x 16 m. Long gabled sheds behind the
  west and south fronts. A flat block east of the hall. An open yard in the north-east behind a curved wall.
  All the roofs are pale grey; none are rust.

## Estimated
- The passages through the west and south fronts, the kiosk row along the north lane, the louvres on the hall,
  the umbrella stalls in the north-east yard, and the night lights.

## Disagreements
- Open Buildings gives 4-6 m along the south edge, but street-level views show the two-storey block there at
  about 10 m. The model follows the street-level views.
