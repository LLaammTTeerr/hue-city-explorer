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
- The OSM footways only roughly give the walk alignments. Widths, the court, the garden beds, the lane and the tower's
  position come from the satellite imagery (reference only, nothing traced into data).

## Estimates
- The summit court (from the z19/z20 satellite) is a paved teardrop, about 33 m across, tipping NW onto the main stair.
  - A lawn disc of 6 m radius sits inside three ring beds. Each bed has a box hedge on a brick kerb, broken by
    labyrinth gaps.
  - There are 7 benches and 4 lamps.
  - The materials (hedge, brick kerb, slate) come from a user photosphere. Its pose was estimated from the image,
    not from its recorded GPS.
- The flower garden near the tower has eight lobed beds (lawn, shrub or dry fill) with brick kerbs and slate paths
  1.7 m wide between them. The lobe sizes are read from the z20 satellite to about 0.5 m.
- Walk widths: main stair 3.4 m; west stair 3.0 m; river, bank and east-flank walks 2.8–3.2 m; branches 2.0–2.4 m;
  north-gate trail 1.4 m.
- A 5 m lane runs from Huyền Trân Công Chúa to the garden and passes a paved apron by the rest stop.
- The Sunset View Point block is a 10.3 × 5.1 m masonry deck, 0.9 m above its highest ground, with a timber rail.
- The tower stands on the deck's NE square, which the z20 image shows as nested squares. The OSM node is about 6 m
  NE of it.
  - Four splayed legs, 13.2 m to the cabin floor and about 17 m to the ridge, painted Huế purple.
  - The form is generic. No photo of it is to hand.
- The rest stop is 9.5 × 7 m on a stone plinth, with cream walls, three windows on each long side, a door and a dark
  hip roof. The walls and roof come from a user photosphere taken on the lane.
- Lamp spacing (about 30 m along the main walk) and the density of the pine infill (a jittered 8 m grid).

## What changed
- The place record comes from the source:
  - scripts/build-data.mjs seeds `vongcanh` from OSM viewpoint node 4603986390. The old seed, [-2784, 5161], was
    on điện Hòn Chén's hill across the river.
  - The §9 summit search moves the record onto the top, at about (−2626, 4523).
  - `dataReach` drops from 1150 to 540.
- data/control-points.json now puts Vọng Cảnh at 16.428, 107.5641 (it was Hòn Chén's position). The point is
  flagged `doubt`: the model's hilltop is 37.5 m against the guides' 43 m.
- Review fixes:
  - **Doubled walks.** The hill's OSM ways used to be drawn twice, once by the generic road pass and once by this
    file. They are now listed in `HAND_WAYS` in scripts/build-data.mjs and skipped there, so the place file draws
    each walk once.
  - **Court and garden.** The court was rebuilt as the labyrinth court the imagery shows. The garden's invented
    hex ring, spokes and hedge rings gave way to the lobed beds.
  - **Lookout terrace and pillboxes removed.** They had no source, and the imagery shows unbroken canopy where they
    stood.
  - **Tower moved** onto the Sunset View Point structure.
  - **Rest stop.** It now has a plinth bedded on its whole footprint, cream walls and paved access.

## Left to do
- The hill is about 5.5 m lower in the model than the documented 43 m. Fixing that needs a terrain recalibration,
  which is a shared matter.
- Confirm from photos:
  - the tower form;
  - what the deck is used for;
  - where the bunkers are (sources mention them but give no positions, so none are modelled);
  - the entrance toilet block.
- No car Street View covers the hill. The ground views were checked against user photospheres, using estimated poses.
