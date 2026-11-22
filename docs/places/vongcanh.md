# Đồi Vọng Cảnh (`vongcanh`)

Builder: `src/landmarks/places/vongcanh.js`. The old `vongCanh()` in `src/landmarks/south.js` now returns early through `replaced('vongcanh')`.

## Sources
- OSM (from the local extract `data/raw/hue-osm-south1.json`):
  - forest ring: way 1075018793 (Đồi Vọng Cảnh);
  - viewpoint: node 4603986390 (tourism=attraction);
  - fire-watch / observation tower: node 13516013279;
  - footways and steps: ways 1075018785–90, 1200924922–26 and 1473264464–68.
- Nominatim: https://nominatim.openstreetmap.org/ (way 1075018793, centre 16.42836 N, 107.56394 E).
- Tuổi Trẻ, 2024 renovation: https://tuoitre.vn/doi-vong-canh-da-doi-khac-sau-khi-duoc-dau-tu-13-ti-dong-20240528145123287.htm
- Vietnam Airlines travel guide: https://www.vietnamairlines.com/at/vi/plan-book/travel/travel-guide/doi-vong-canh
- Also consulted: vinwonders.com and junglebosstours.com guides to Vọng Cảnh hill.

## Confirmed facts
- The hill is about 43 m high, on the right (east) bank of the Hương river, opposite Hòn Chén. It is covered in pine forest.
- In the 2024 renovation (13 billion đồng), stone was laid on the walks and the stepped climb (about 200 m of steps). Pines were planted, a flower garden was made near the top (sim, tường vi, ngũ sắc), and night lighting was added.
- The rangers' steel fire-watch tower was repainted "tím Huế" (Huế purple) and is now used as a lookout. Sources give its height as over 15 m, with an iron frame and a wooden floor.
- Bunkers and gun pits from before 1975 remain on the hill.
- Walk alignments and the positions of the viewpoint and tower come from OSM.

## Estimates
- The lookout terrace above the river: 7 × 13 m, a 0.6 m parapet, three benches and two lamps.
- The positions and form of the two pillboxes.
- The tower: four splayed legs, 13.2 m to the cabin floor and about 17 m to the roof ridge, with timber stair flights. The details are generic.
- The garden: 18 flower clumps round the OSM ring, plus 14 sim bushes along the main stair.
- Lamp spacing (about 30 m along the main walk) and the density of the pine infill (a jittered 8 m grid).

## What changed
- The place record comes from the source:
  - scripts/build-data.mjs now seeds `vongcanh` from OSM viewpoint node 4603986390. The old seed, [-2784, 5161], was on điện Hòn Chén's hill across the river.
  - The §9 summit search moves the record onto the top, at about (−2626, 4523).
  - The runtime move in the place file is gone, and `dataReach` drops from 1150 to 540.
- data/control-points.json now puts Vọng Cảnh at 16.428, 107.5641 (it was 16.42222, 107.56278, which is Hòn Chén).
  - The point is flagged `doubt`. The model's hilltop is 37.5 m against the guides' 43 m.
  - Bare-earth data reads about 35 m there and the surface model about 44 m, so 43 m may include the canopy or be a rounded figure.
- The walks were checked against the satellite (reference only; nothing traced into data).
  - The garden, upper court, road, east walk and river walk already matched to 1–2 m.
  - The main stepped climb was redrawn, along with its branch to the garden, the west stair, the tower walk and the top of the west-flank walk. Their OSM alignments ran up to about 10 m off the visible paths.
  - The old zigzag walk, which does not appear on the imagery, was removed.
- Added the rest stop at the foot of the main stair, near (−2725, 4357): a 9.5 × 7 m single-storey block with a glazed front and a grey hip roof. Its form is estimated.
- Kept from the first pass:
  - the stone walks with step risers;
  - the river lookout terrace;
  - the pillboxes, garden, sim bushes, purple tower, night lamps and pine conversion.

## Left to do
- The hill is about 5.5 m lower in the model than the documented 43 m. Fixing that needs a terrain recalibration, which is a shared matter.
- Confirm from photos:
  - the tower form;
  - the rest-stop elevations;
  - the terrace and pillbox positions;
  - the entrance toilet block.
- No usable Street View was available (the captures came back black).
