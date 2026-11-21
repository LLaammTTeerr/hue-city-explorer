# Cửa Chương Đức (彰德門), the Imperial City's west gate

Model: `src/landmarks/places/chuongduc.js`. The generic Imperial City gate in `src/landmarks/citadel.js` `gate()` now
skips this gate when `replaced('chuongduc')` is true. The Imperial City wall (`places/dainoi.js`) already stops at the
gate's OSM footprint, which it reads from `data.gates`.

## Sources
- OpenStreetMap way 531016858 (`historic=city_gate`, `name=Chương Đức`, `name:zh=彰德門`), from `data/raw/hue-osm.json`.
  Wall ways 531016856 and 531031608 meet its two short sides.
- https://vi.wikipedia.org/wiki/Hoàng_thành_Huế
  - Built in 1804 under Gia Long as a simple tam quan with no tower; rebuilt in 1921 under Khải Định.
  - Three storeys. The piers are divided into panels, each with a different mosaic subject.
  - Yellow glazed tiles (hoàng lưu ly): the round tile ends carry 壽, the lower ends bats.
  - Badly damaged after 1945; restored in 2003–2004 to its Khải Định form.
- https://www.gpsmycity.com/attractions/cua-chuong-duc-(chuong-duc-gate)-51191.html: three entrances; built 1804, rebuilt
  in 1921; ceramic and glass mosaic on the columns, walls and rooflines; 壽 and bat motifs.
- https://vov.gov.vn/a-close-look-at-the-four-gates-into-the-hue-imperial-citadel-dtnew-1022462: the gate of the palace
  women; three floors with many decorated compartments.

## Confirmed
- Footprint 12.7 × 5.4 m, with the long side on the wall line (OSM).
- Three passages and three storeys.
- Yellow glazed tile roofs, and dense porcelain and glass mosaic on the piers.
- Restored in 2003–2004.

## Estimated
- Passage sizes: middle 2.6 m wide with its crown at about 4.1 m; sides 1.9 m wide with their crowns at about 3.25 m.
  The middle bay is 4.7 m wide.
- Heights: side bays 4.6 m, middle bay 6.0 m, upper storey to 8.6 m, ridge 10.05 m, finial about 10.9 m.
- Colours: the ochre-yellow lime render and the mosaic colours.
- Details: the round windows of the upper storey, the lotus caps on the pilasters, the half-open red doors, the paved
  apron and the form of the ridge ornament.
- The gate is not in `docs/heights-reference.json`; I found no sourced height for it.

## Changed
- The old model was the generic Imperial City gate: a plain block with a two-tier, red-walled pavilion on top.
- The new model is a stepped three-bay gate:
  - lower side bays, each under its own roof;
  - a taller middle bay with the name board, then a skirt roof, a small upper storey and the top roof;
  - pilasters panelled in mosaic;
  - wall stubs where the Imperial City wall butts against the gate's flanks.

## Left
- No dimensions were measured from photos. Heights and bay widths should be checked against an elevation drawing or a
  photo.
- The mosaic is only suggested by coloured panels. The 彰德門 board has gold blocks in place of characters.
