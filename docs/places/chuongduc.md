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
- From Google Street View (a car pano on Trần Nguyễn Hãn about 84 m south-west, and a user photosphere on the Lê Huân
  lawn, its pose estimated from the image), scaled against the 12.7 m footprint:
  - one lower block of even height, about 4.4–4.65 m, with a continuous frieze and cornice; no bay stands taller;
  - three arches of nearly one size, crowns level, 3.1 m apart (see the review fixes below);
  - a roof tier over the whole block, and a narrow upper storey (about 3.4 m wide, eaves near 7.9 m) under the top roof;
    ridge about 9.35 m, finial about 10.2 m;
  - the side passages shut with red doors, the middle one open;
  - a pale, weathered lime render with ochre-yellow arch rings; the mosaic reads pale from the road.
- Colours of the mosaic, the round windows of the upper storey, the lotus caps, the paved apron and the ridge
  ornament are still estimates.
- The gate is not in `docs/heights-reference.json`; I found no sourced height for it.
- Position: the satellite puts the gate about 1.5 m north-west along the wall from the OSM outline, within the 2 m
  tolerance; the outline is kept because the wall (`places/dainoi.js`) is cut at it. Axis 143° (OSM) against about 144°.

## Changed
- The old model was the generic Imperial City gate: a plain block with a two-tier, red-walled pavilion on top.
- The new model is a stepped three-bay gate:
  - lower side bays, each under its own roof;
  - a taller middle bay with the name board, then a skirt roof, a small upper storey and the top roof;
  - pilasters panelled in mosaic;
  - wall stubs where the Imperial City wall butts against the gate's flanks.

- Rebuilt from Street View (2026): the stepped bays (middle block 6.0 m, side bays 4.6 m under their own roofs, a much
  larger middle arch) became one even block with three like arches, a roof tier over all of it and the upper storey.

- Review fixes (2026), measured on the car pano (good to a metre or two) against the arch spacing:
  - the block is about 10.8 m across and 4.4 m above its floor, arches 3.1 m apart (side 1.5 m, middle 1.6 m wide);
    the rest of the 12.7 m outline is a lower flanking pier at each end, rising just above the wall's coping;
  - lower roof: a level skirt about 1.7 m deep, the lift kept to the corner tips, overhang 0.4 m;
  - top roof: a small plain hip roof, modest upturn, gourd finial on the ridge; no horns, no hip ridges;
  - no red fascia: a thin ochre tile-end line;
  - a pale grey lime wall, muted mosaic panels, thin ochre arch surrounds;
  - a decorated frieze across the full width between the arch crowns and the cornice;
  - the gate stands on a stone terrace 0.85 m high with a balustrade on the moat side and steps at either end, as the
    user photosphere shows. Both panos put the wall top at 0.6–0.7 of the block; the wall (`hoangthanh.js` OUTER, 4.17 m
    with coping) was not changed, and the terrace brings it to about 0.73 of the block. If the wall really is lower
    here, that is the wall's height, not the gate's.

## Left
- The model's moat runs 12–19 m off the gate (skewed); the real one is about 9–10 m off, so the terrace is cut short
  of it. Proportions come from distant Street View; an elevation drawing would settle the arch and storey heights.
- The mosaic is only suggested by coloured panels. The 彰德門 board has gold blocks in place of characters.
