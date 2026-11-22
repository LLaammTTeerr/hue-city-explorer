# Điện Thái Hòa (`thaihoa`)

The model is `src/landmarks/places/thaihoa.js`, a replica. It covers the throne hall, its two-stage base, sân Đại Triều Nghi, and cầu Trung Đạo over hồ Thái Dịch.

The old block in `src/landmarks/citadel.js` now draws only when the replica is absent (`!replaced('thaihoa')`).

It is modelled as it stands in 2026, after the 2021–2024 restoration (reopened 23 Nov 2024).

## Sources
- vi.wikipedia, Điện Thái Hòa (Hoàng thành Huế): https://vi.wikipedia.org/wiki/%C4%90i%E1%BB%87n_Th%C3%A1i_H%C3%B2a_(Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF)
  - Plan "trùng thiềm điệp ốc": a front hall and a main hall under joined roofs.
  - 80 lim columns, lacquered red with gilt dragons. Yellow glazed roof tiles.
  - "Lưỡng long chầu nhật" on the main ridge. Poem panels in the cổ diêm band.
  - Sân Đại Triều Nghi in two levels, with stone rank markers (phẩm sơn) for the civil and military mandarins.
  - Cầu Trung Đạo leads to it over hồ Thái Dịch from Ngọ Môn.
- Khám phá Huế, Thai Hoa Palace: https://khamphahue.com.vn/en-us/Tourism/Detail/tid/Thai-Hoa-Palace.html/pid/17681/cid/485
  - The hall stands on a base about 1 m above the esplanade.
  - 18 rank stones a side (9 ranks, chánh and tòng).
  - The 2021–24 restoration.
- OpenStreetMap (local extract `data/raw/hue-osm*.json`):
  - way 531031566: the hall outline, 44.8 × 32.1 m.
  - way 285990342: sân Đại Triều Nghi, about 41 × 41 m.
  - way 619851682: cầu Trung Đạo, 51 × 8.9 m.
  - way 173640276: hồ Thái Dịch.
  - These give the position, the axis toward Ngọ Môn and the plan sizes.
- Height: `docs/heights-reference.json`, 11.8 m (sourced).

## Confirmed
- Two halls in one plan, the front one single-roofed and the main one double-roofed with a cổ diêm band.
- 80 columns (modelled as a 10 × 8 grid, 9 bays across).
- Yellow glazed roofs. The dragons-and-sun ornament on the main ridge.
- The hall floor is about 1 m above the upper terrace.
- Two esplanade terraces with a central imperial way.
- 18 pairs of rank stones in one line each side of the way: 3 ranks (6 stones a side) on Đan Bệ, 6 ranks (12 a side) on Long Trì.
- Bridge plan size from OSM.
- Ridge at about 12.0 m above the ground (the reference is 11.8 m). The sun disc reaches 13.1 m, inside the check's band; `npm run check` passes.

## Estimated
- Terrace heights: Long Trì 0.6 m, Đan Bệ 1.35 m, hall floor 2.35 m. Number of steps per flight.
- Bay widths, and the depth split: front hall about 10 m, main hall about 18 m.
- Inner column heights. Roof pitches and overhangs.
- The size and colours of the enamel panels.
- The two bronze cauldrons on Đan Bệ (their positions).
- Bridge: deck height, pier spacing (on piers rather than modelled vaults), parapet pattern, and the two bronze nghi môn gates.
- Night lighting placement.

## What changed
- New replica:
  - The front hall's verandah of free-standing red columns, with gilt bands and stone bases.
  - Door leaves across the front and back, ochre gable walls with the round Thọ windows.
  - Separate roofs joined by a bronze valley gutter.
  - The main hall's skirt, enamelled cổ diêm band, and upper roof with lưỡng long chầu nhật.
- The esplanade:
  - Its two terraces are now at true positions along the axis, with three flights each and dragon balustrades on the middle flights.
  - The rank stones go from 9 per side per terrace (54) to the correct 6 + 12 per side (36).
- Cầu Trung Đạo:
  - Now modelled here: a flat deck with a raised central lane, parapets, piers and bronze gates.
  - `src/geo/bridges.js` gives it `own: true`, so the generic humped deck in city.js is no longer drawn under it.
- Shared hook (small, reported):
  - `coverOf` in `src/geo/city.js` now honours `structures.paved`, index ranges a model marks as paved courts.
  - Upward faces there keep trees and houses off even when they are under 0.7 m / 2.2 m.
  - Without it, the 0.6 m Long Trì terrace had trees on it.
- About 11.2k triangles.

## Satellite and Street View alignment (2026-11)
- Checked against Google satellite (z17, z19, z20) and four user photospheres from the south-east. These are visual reference only; nothing was traced into `data/`.
- Position and axis were already right: within about 2 m and 2° at z19. The bridge and sân line up within about 1 m. At z20 the roof sits about 2 m north-west, which is most likely image lean, so the hall was not moved.
- The plan was too wide. The OSM outline (44.8 × 32.1 m) had been read as the column line, so the eaves reached about 49 m. The satellite roof is about 44 × 31 m. The outer column line is now at ±20.1 m across (`HU`), and the depth line runs from 13.7 m to −13.7 m.
- The front was too tall and too uniform. The south-east pano shows three bands: a low front roof, the enamelled cổ diêm band, then the upper roof. Changes:
  - Verandah columns are 3.9 m (was 4.3).
  - The front roof rises 1.6 m (`FRH`).
  - The upper hip is 31.4 m wide. The skirt runs from floor +5.6 m to +6.4 m.
  - Corner flare is 0.3 (was 0.55).
  - The ridge stays at floor +9.65 m, so the sourced 11.8 m holds.
- All four panos are user photospheres, so the camera pose is estimated. They look pre-restoration (faded tiles, pale columns). The model keeps the restored 2024 colours.

## Left to do
- The bridge is drawn on piers. Its 5 brick vaults are not modelled.
- No interior: no throne, no inner columns' lacquer detail beyond bands.
- The exact rank-stone spacing, the cauldrons, and the nghi môn design are unverified against photos.
