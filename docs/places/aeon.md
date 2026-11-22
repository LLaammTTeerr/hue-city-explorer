# AEON MALL Huế (`aeon`)

Model: `src/landmarks/places/aeon.js`. Issue #71.

## Sources
- OSM way 1575540652 (`building=retail`, `shop=mall`), the L-shaped building with its rounded outer corner, read as
  `data.special.aeon`; way 1152318720 (`landuse=retail`, "ÆON MALL Huế") for the site; way 1575540651
  (`amenity=parking`), the car park behind the long wing.
- AEONMALL Vietnam press release "AEON MALL Hue Grand Opening" (21/9/2024, 31-page PDF),
  https://aeonmall-vietnam.com/wp-content/uploads/2024/09/24.09.21_PR_AMVN_AEON-MALL-Hue-Grand-Opening-Ceremony_ENG.pdf:
  RC structure, 4 floors and 1 basement, site about 86,000 m², gross floor area about 138,000 m², about 140 shops,
  parking for 1,200 cars and 8,000 motorbikes, the floor map, the "Culture Stream" exterior concept, the sunken Moon
  Garden on the south side under the 3F/4F terrace street, 2,000 kW of rooftop solar. Its concept and night renders
  (marked tentative) are the main reference for the exterior.
- AEONMALL Vietnam, groundbreaking 11/2/2023,
  https://aeonmall-vietnam.com/en/the-1st-aeon-mall-in-central-vietnam-construction-commencement-ceremony-of-aeon-mall-hue/;
  soft opening 16/9/2024, https://aeonmall-vietnam.com/en/aeon-mall-hue-opens-to-welcome-guests-on-september-16th.
- Nhà Đầu Tư (21/9/2024), https://nhadautu.vn/aeon-mall-khai-truong-du-an-170-trieu-usd-o-hue-d89167.html, and
  VnExpress International (23/9/2024),
  https://e.vnexpress.net/news/business/companies/aeon-opens-its-first-shopping-mall-in-central-vietnam-4796072.html:
  about US$170 million, AEON's seventh mall in Vietnam and its first in central Vietnam.
- Tạp chí Công Thương (21/9/2024),
  https://tapchicongthuong.vn/khai-truong-aeon-mall-hue-trung-tam-thuong-mai-lon-nhat-mien-trung-126945.htm: an
  opening-day drone photo of the front (copyrighted, used for reference only).
- No freely licensed photo was found.

## Confirmed
- Footprint and position (OSM); 4 floors and a basement (press release).
- From the renders and the drone photo: the main entrance is on the rounded outer corner, facing north-west over the
  forecourt to the Võ Nguyên Giáp junction (the render's background of lagoon and hills puts its camera looking south-east).
  The entrance is a dark glass front through the floors, framed by a sweeping white band carrying AEON MALL in magenta.
  Screens of vertical bronze fins rise above the roof on either side. Below them are taupe walls with shopfronts, and an
  orange box stands forward to the right of the entrance. White end blocks carry magenta AEON sign boxes, and tree
  terraces sit on the inner side.

## Sources disagree
- Height: the 2022 investment documents allowed up to 60 m and about 8 floors; the building as opened has 4 floors and a
  basement. The model follows the building as built.
- Investment: US$167 million (VND 3,916 billion, 2023) against about US$170 million (US$169.67 million) at opening.
  The card says "about US$170 million".
- Opening: soft opening 16/9/2024, opening ceremony 21/9/2024. The card gives both.

## Estimates
- No height is published, so there is no entry in `docs/heights-reference.json`. Four mall storeys of about 5.5 m give a
  roof at 22 m with a 1.2 m parapet. The fin screens (25.5 m) and the end blocks (25 and 27 m) are read off the renders
  against the storeys.
- The white band stands 3 m proud of the glass. Fin spacing, shopfront rhythm, the orange box (30 × 8.4 m) and the
  roof terraces' layout are from the renders, not measured.

## Left
- The front car park and its solar carports are not mapped in OSM, so they are not drawn.
- The Moon Garden is below ground and is not modelled.
- Inside signs and tenant shopfronts are generic.

## Data changes made for this place
- The city frame (`scripts/frame.json`) moved its east edge from 107.613 to 107.620 E to take in the mall. Three new
  OSM extracts cover the strip (`scripts/fetch-osm-east.sh`, `data/raw/hue-osm-east1..3.json`), and the paved extract
  was refetched over the wider box.
- The building-height rasters (`data/raw/heights/gishue.*`, `open-buildings-2023.*`) were refetched over the wider
  grid. The old values were then spliced back over the old area, so no building in the old city changes height. New
  values are used only east of the old grid and in the northern rows that the old grid had not covered, so the northern
  villages get raster heights for the first time.
- ICESat-2 lidar was not refetched for the wider box.
- Sampan moorings now need the whole hull in water (bow, stern and bankward side). With the reshuffled water polygons,
  two moorings in the citadel moat would otherwise have sat half on the bank.
