# Bến xe phía Nam (`benxenam`)

Model: `src/landmarks/places/benxenam.js`. Issue #71.

## Sources
- OSM way 260244336 (`building=yes`, 36.6 × 15.2 m), the station building, read as `data.special.benxenam`; OSM way 260244335 (`amenity=bus_station`, about 9,460 m²) is the paved station lot. No `height` or `building:levels` tags.
- benxehue.vn (the operator, Công ty CP Bến xe Huế):
  - layout plan, https://benxehue.vn/so-do-ben-xe?ben=phia-nam: "Nhà điều hành (tầng 2) / Phòng vé (tầng 1)" at the front on An Dương Vương, the yard behind, kiosks round the back and east side;
  - 2024 refurbishment, https://benxehue.vn/danh-muc/ben-xe-phia-nam/ben-xe-phia-nam-dau-t-nang-cap-chinh-trang-sua-chua-h-ong-den-ky-niem-30-n-m-thanh-lap-cong-ty (30/03/2024, 13 photos of the front, entrance and pick-up canopy; LED screen, toilets, cameras, barrier, signs; no amount);
  - land, https://benxehue.vn/danh-muc/co-so-vat-chat/hien-trang-su-dung-dat-dai-tai-cong-ty-co-phan-ben-xe-hue: 14,190.0 m², leased to 01/07/2064 (2019 photo of the front);
  - history, https://benxehue.vn/lich-su-hinh-thanh: company founded 14/4/1994, head office "Tầng 2, 97 An Dương Vương".
- https://paracelresort.com/ben-xe-phia-nam-thanh-pho-hue-dia-chi-gia-ve-lich-trinh-va-cach-dat-ve/ (2026): front, canopy and yard photos.
- https://vivutoday.com/cac-ben-xe-hue-dia-chi-lich-trinh-gia-ve/: two storeys, offices upstairs; the only source for "12 tỷ đồng" invested, with no year (not used).
- Green SM's article photos labelled "Internet sources" show other stations and were ignored.

## Confirmed
- Footprint and position (OSM); two storeys, ticket hall below and offices above (plan, photos, vivutoday).
- From the photos: a symmetrical front on a raised plinth with a wide flight of granite steps; a projecting middle bay under a low pediment with a round emblem and a blue "CÔNG TY CỔ PHẦN BẾN XE HUẾ" sign; a slab between the floors along the front with bonsai pots; round white columns at the entrance; flat roof with a deep white eave; a glass ribbon and balustrade on the yard side; a pick-up canopy along the yard side (grey metal roof, brown lambris ceiling, yellow fascia, red-and-white columns, "KHU VỰC ĐÓN KHÁCH / PICK UP AREA").

## Sources disagree
- Wall colour: yellow with white trim (2024–26 photos) against pale cream (2019 photo). Modelled yellow, taking the recent photos and reading the 2019 one as before a repaint or in flat light.

## Estimates
- No height is published, so there is no entry in `docs/heights-reference.json`. From photos against people and steps: plinth 1.0 m, first floor at 3.9 m, roof at 7.5 m, eave 8.0 m, pediment top about 10.5 m.
- Middle bay width (11 m) and projection (0.9 m), window spacing, canopy depth (9 m), clear height (5.2 m) and length (the building's length plus a few metres) are read off the photos.

## Left
- The kiosk rows, garages, the PV Oil canopy (OSM way 1473271773 is drawn by the generic builder) and the yard's bay island are not modelled.
- The 2024 LED banner and inside signs are not drawn.
