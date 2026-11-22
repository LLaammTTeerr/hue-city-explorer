# Lăng Khải Định (Ứng Lăng)

Replica: `src/landmarks/places/khaidinh.js` (id `khaidinh`). The older generic tomb builder in
`src/landmarks/tombs.js` skips this site through `replaced('khaidinh')`.

## Sources
- https://vi.wikipedia.org/wiki/Lăng_Khải_Định
- https://en.wikipedia.org/wiki/Tomb_of_Kh%E1%BA%A3i_%C4%90%E1%BB%8Bnh
- OpenStreetMap, as baked into `public/data/hue.json`: precinct way 175035807, Cung Thiên Định 242940960,
  Tả/Hữu Tòng Tự 242940962 / 242940963, Bi Đình 242940961, outbuildings 1205438742 and 1330598711.
  The axis (SW to NE, up Châu Chữ hill) and the positions of the courts come from these rings.

## Confirmed facts (from the sources)
- Precinct about 117 × 48.5 m (the satellite fits 117 m from the head of the first stair), closed by a fence about 3 m high; everything in concrete, now weathered dark grey.
- 127 steps in all. The first flight has 37 steps in three lanes, with 4 dragon balustrades.
- First court (Tòng Tự): about 47 × 24.5 m, with two three-bay side houses (Tả and Hữu Tòng Tự).
- A second flight of 29 steps leads to the Bái Đình (salutation court), about 47 × 40.5 m, with two rows of statues
  each side (elephants, horses, civil and military mandarins, soldiers).
- Bi Đình: an octagonal concrete pavilion with a two-tier roof imitating ardoise slate; the stele is about 3.1 × 1.2 m
  on a plinth about 0.76 × 0.85 × 2.1 m.
- Two trụ biểu (obelisks) flank the stele pavilion.
- Three more courts, 13 steps apart, each flight with 4 dragon balustrades; two concrete flagpoles.
- Cung Thiên Định: about 34.5 × 26.4 m, five rooms, raised on terraces at the top; the Khải Thành shrine at its back
  rises higher.

## Estimates (not in the sources)
- How the last 61 steps split: 13 + 13 + 13 + 22. The riser height is fitted to the terrain (0.15–0.2 m).
- Court depths follow the satellite (2026-11 re-frame, below) rather than the Wikipedia figures where they disagree.
- **Layout read off the satellite (2026-11).** Google satellite, used as visual reference only (no imagery or traced
  outline is kept in the repo), measured in the place file's frame (s up the axis from the precinct's front edge, t
  across). The precinct's front and sides match OSM way 175035807 to about half a metre and its axis to 1–3°. The
  wall lines between the courts stand at s 26.5 (Bái Đình's front), 51, 61 and 70.7, the palace terrace at 81; the
  model had 31, 57, 64 and 71. The 29-step flight is about 22 m wide (s 20–26.5). Behind the stele pavilion
  (centre s 45) the way up is two flights either side at t ±13; the next two walls have a central flight and narrow
  ones near t ±19.5. Statue rows at t ±10.4 and ±15.2 from s 29.5 to 38.7; obelisks near s 45.5, t ±19 (Street View
  from the palace terrace suggests ±18; the model uses ±18.5). Cung Thiên Định: main roof s 87.5–113, t −18.2–18.7;
  a dark lean-to porch roof the full width at s 83–87.5; a raised square tier about 18.5 m over the back middle (s
  94.7–113), its ridge across the axis. No corner pavilions on the front. OSM's palace ring (242940960, s 81.5–107.6)
  is about 5 m short of the roof up the axis and OSM's precinct ends at 109.6 m, under the palace roof; the model runs
  the precinct to the plan's 117 m (s 116.5), behind the trees that hide its back on the satellite.
- **The Bái Đình's 40.5 m (checked 2026-11, not changed).** vi.wikipedia gives "sân Bái đình (47m x 40,5m)" with no
  dài/rộng labels. In the same article the other pairs read across × along the axis when set against OSM: Cung Thiên
  Định 34.5 × 26.4 (OSM 35.0 across, 26.2 along) and the Tòng Tự court 47 × 24.5 (the model's court runs 23.8 m up
  the axis). By that convention 40.5 m is along the axis, where the model's court runs 26 m (s = 31 to 57). But OSM
  puts the Bi Đình (way 242940961), which the article says stands "ở giữa phía cuối sân", at s 42–49, and the palace
  front at s 81.5 (before the 2026-11 re-frame, which puts the court at s 26.5–51, 24.5 m). A 40.5 m court (s 31 to 71.5) would leave about 10 m for three more courts and 61 steps, and the
  article's own 117 m total does not fit it either. So the figure cannot be the Bái Đình alone on the axis; the court
  stays at OSM's positions. One reading (speculation): 31 + 40.5 ≈ 71, the top of the third of the upper courts, so
  the figure may span the Bái Đình and the courts above it. Needs a survey drawing to settle.
- All heights: walls, piers, Bi Đình (~8 m), obelisks (~15 m), palace (~12 m at the Khải Thành, checked against
  docs/heights-reference.json's 11–12 m estimate).
- Form of the main gate (four tower-capped piers with iron gates), the count and size of statues, flagpole positions.
- Outbuildings are plain houses. The ticket kiosk (OSM 1330598717) is back, as a timber kiosk under a tiled roof
  (Street View from the south-east road), moved 5.6 m up the axis because its OSM ring lies half on the model's road.
- The hill below the front wall either side of the first stair: Street View from Đ. Đại Nam shows two terraces of
  rubble stone with grass tops, the court wall with a wrought-iron railing above. The model's court stands higher over
  the road than the photo suggests (the riser is fitted to the terrain), so it draws three tiers.
- Lamp standards at the head of the top two flights and lattice parapets along the upper courts' front edges: from a
  visitor's Street View on the palace terrace.

## What changed
- New per-place replica: stepped levels down the hill with parapets and posts, all flights with dragon
  balustrades, the Tòng Tự houses, the statue court, the octagonal Bi Đình with its stele, the obelisks,
  the flagpoles and Thiên Định palace (plinth, arched portico, main hip roof, raised two-tier Khải Thành,
  corner pavilions; replaced in the 2026-11 re-frame by the porch roof and the square raised tier). Flat dark-grey concrete colours (no brick courses). Courts marked as paved.
- About 10k triangles, well under the 120k budget.

## What's left
- Palace interior (the glass and porcelain mosaics, the bronze statue under its canopy) is not modelled.
- Exact heights, the gate's real form and the statue arrangement need on-site or survey figures.
- **The Bái Đình's depth waits on a survey drawing** (owner's call, 2026-11-21): the 40.5 m stays unapplied until a
  measured plan settles which axis it measures and where the court ends. Searched 2026-11-21 (vi/en web, the
  heritage and travel write-ups, thesis repositories): no published site plan or measured drawing; every source
  repeats vi.wikipedia's figures. Likely holders: the Huế Monuments Conservation Centre (Trung tâm Bảo tồn Di tích Cố
  đô Huế) and the EFEO archives. When one turns up, check the court ends against OSM's Bi Đình (s 42–49) first.
