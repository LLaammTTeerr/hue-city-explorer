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
- The outline of the lot, about 2,300 m², and the streets around it (OSM).
- The overall height (survey) and how height is spread over the block (Open Buildings).

## Estimated
No public description or usable photo was found. Wikipedia vi has no article and Commons has no photo, so
everything below is an estimate:
- **Front block.** Two storeys on Hùng Vương, 11 x 25 m, 8.4 m to the parapet, in cream render. The gate is in the
  middle, between yellow piers, under a raised panel reading "CHỢ AN CỰU" in red on cream.
- **Main hall.** 29 x 36 m. Cream walls 6.2 m high, a grey corrugated-steel hip roof, and a louvred lantern on the
  ridge reaching about 12 m.
- **Kiosk rows.** Single-storey, with roller shutters and sheet awnings. They line the north lane, the corner on
  Hùng Vương - Đặng Văn Ngữ, the south edge and the south half of the east lane.
- **East shed.** An open stall shed on steel posts along the north half of the east lane.
- **Umbrella stalls.** In the north-east yard and in the lane behind the front block.
- **Colours.** Cream walls, grey and rust sheet roofs (the usual roofing for a Huế market).
- **Night lights.** Tube lights under the front canopy and the gate, and lamps over the yard and the east shed.

## Left to do
- Check the front, the gate, the sign and the roof colours against a real photo or street view.
- The inner layout (one hall or several) is a guess from the height rasters.
