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
- The place record is moved at runtime to the real viewpoint (−2641.6, 4524.1).
  - The scripts/build-data.mjs seed (`addPlace('vongcanh', …, [-2784, 5161])`, about line 1027) and data/control-points.json (16.42222, 107.56278) both put Vọng Cảnh on Ngọc Trản / Hòn Chén hill across the river. They should become about [-2642, 4524] / 16.4280, 107.5641. These files were not edited.
- The old pavilion on a drum and the pillboxes at the wrong spot are replaced. In their place:
  - stone walks draped on the ground, with risers on the steps;
  - the river lookout terrace (marked paved);
  - pillboxes;
  - the garden and sim bushes;
  - the purple tower;
  - night lamps (glow points).
- Trees are cleared off the walks and open ground. About 90% of the trees inside the forest ring are converted to pines, and pines are added inside the ring.
- The terrain is unchanged. The existing grid already has the hill, about 33–34 m above the city floor (the sources give 43 m above sea level). No local ground is modelled.

## Left to do
- Fix the seed and control point at the source (in a shared-data pass).
- Add the rest stop that was under construction in 2024 and the entrance toilet block.
- Confirm the exact tower form and garden layout from photos.
