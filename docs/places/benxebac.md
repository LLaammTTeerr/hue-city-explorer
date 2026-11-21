# Bến xe phía Bắc (`benxebac`)

Model: `src/landmarks/places/benxebac.js`. Issue #71.

## Sources
- OSM node 4797504422 (`amenity=bus_station`, "Ben Xe Phía Băc") and way 1435288831 (`building=yes`, 1,503 m², irregular), read as `data.special.benxebac`. No `height` or `building:levels` tags. OSM maps no yard area; the station's service roads (ways 656647882, 656647880) are mapped.
- benxehue.vn: land 19,546.8 m², leased to 01/07/2064 (https://benxehue.vn/danh-muc/co-so-vat-chat/hien-trang-su-dung-dat-dai-tai-cong-ty-co-phan-ben-xe-hue); station office "Tầng 2, 132B Lý Thái Tổ" (https://benxehue.vn/lich-su-hinh-thanh).
- https://bookaway.com/routes/vietnam/hue/northern-bus-station-hue: "a 2 storey, yellow building", photo of the front.
- https://mia.vn/cam-nang-du-lich/ben-xe-phia-bac-hue-19365 (2025): photos of the building (older) and the yard canopy.

## Confirmed
- Position (OSM) and two storeys (Bookaway, benxehue).
- From the photos: a box-like block in bright yellow with white trim; a thick white roof slab overhanging all round; a white slab between the floors with a parapet and planters; white-framed ribbon windows and a semicircular arched window in the middle of the upper floor; a blue sign over the doors; a canopy on yellow square columns with a yellow fascia over the minibus bays.

## Sources disagree
- The name sign: a blue board on the roof (older mia.vn photo) against red letters on the fascia (newer Bookaway photo). Modelled with the newer red letters (shortened to "BEN XE HUE").

## Interpretation
- Way 1435288831 is larger than the hall in the photos. It is read as three parts: the block of about 27 × 30 m on Lý Thái Tổ is the two-storey hall; the narrower range of about 31 × 17 m reaching west along the yard is the bus canopy (the photos put the canopy beside the hall over the bays); the small piece behind is a one-storey office. Not confirmed by a plan.
- With no yard mapped, procedural infill houses stood in the station's forecourt. `scripts/build-data.mjs` now clears (NOBUILD | TREE) the hull of the hall, the two service roads and their feet on Lý Thái Tổ, about 0.6 ha of the 1.95 ha lot. The rest of the lot's extent is unknown, so it is left alone.

## Estimates
- No height is published, so there is no entry in `docs/heights-reference.json`. From photos: first floor at 3.7 m, roof at 7.2 m, roof slab to 7.75 m; canopy at 4.6 m; office 3.8 m.

## Left
- The street gate (no photo found), the 22 × 13 m building about 100 m south-east (way 1050198493, use unknown) and the yard surface are not modelled specially.
