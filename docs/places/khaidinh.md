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
- Precinct about 117 × 48.5 m, closed by a fence about 3 m high; everything in concrete, now weathered dark grey.
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
- Court depths follow OSM positions rather than the Wikipedia figures where they disagree (Bái Đình runs shorter in OSM).
- All heights: walls, piers, Bi Đình (~8 m), obelisks (~15 m), palace (~12 m at the Khải Thành, checked against
  docs/heights-reference.json's 11–12 m estimate).
- Form of the main gate (four tower-capped piers with iron gates), the count and size of statues, flagpole positions.
- Outbuildings are plain houses; OSM way 1330598717 was dropped because the road runs over it in the data.

## What changed
- New per-place replica: stepped levels down the hill with parapets and posts, all flights with dragon
  balustrades, the Tòng Tự houses, the statue court, the octagonal Bi Đình with its stele, the obelisks,
  the flagpoles and Thiên Định palace (plinth, arched portico, main hip roof, raised two-tier Khải Thành,
  corner pavilions). Flat dark-grey concrete colours (no brick courses). Courts marked as paved.
- About 10k triangles, well under the 120k budget.

## What's left
- Palace interior (the glass and porcelain mosaics, the bronze statue under its canopy) is not modelled.
- Exact heights, the gate's real form and the statue arrangement need on-site or survey figures.
