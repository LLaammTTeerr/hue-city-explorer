# Thương Bạc (`thuongbac`)

Model: `src/landmarks/places/thuongbac.js`. Before this, the place was only its OSM footprint, drawn by the city
builder as a generic tiled hall (the `OLD_HALL` / `TRUE_H` 6.5 m entry in `scripts/build-data.mjs`). The replica takes
that footprint out of `data.bld` at build time, so no guard line was needed in an older builder.

## Sources
- OSM way 239568223 (`building=yes`, `historic=building`, `name=Thương Bạc`), from `data/raw/hue-osm.json`: a near-square
  footprint of 16.2 m × 17.0 m in công viên Thương Bạc (OSM way 217766984), about 37 m back from the bank.
- https://www.huesmiletravel.com/thuong-bac-hall-hue-city: first built 1870 (Tự Đức), rebuilt 1921 (Khải Định) as an
  octagonal pavilion on a square base about 1.3 m high with railings; "Thương Bạc" in cement on the front and back; a court
  with two cement ponds and rockeries, four carved stone dragons; four main pillars with lotus tops and porcelain couplets.
- https://tatinta.com/diem-den/dinh-thuong-bac/7765: the same 1921 facts (octagonal lầu of cement and reinforced concrete,
  base 1.3 m, solid railings with "Thương Bạc" in relief, two ponds, four dragons, four lotus-topped gate pillars). It also
  mentions a small octagonal pavilion Bảo Đại built near the old site in 1936.

## Confirmed
- Octagonal plan, reinforced concrete (1921). Square base 1.3 m high with railings, the name in relief front and back.
- Court with two cement ponds and rockeries, four stone dragons; four gate pillars crowned with lotus buds, with couplets.

## Photo and satellite audit (2026)
Checked against satellite imagery and Street View from Trần Hưng Đạo and the court (visual reference only; nothing traced).
- Position: the pavilion stood about 2 m east of the satellite roof; the place file now shifts the OSM centroid 2 m west
  along x. Axis kept at the OSM bearing (within about 2° of the satellite).
- Platform: the satellite platform is about 12.8 × 14.4 m, smaller than the OSM outline (16.2 × 17.0 m). The court photo
  shows the base about 1.0 m above today's paving, and 1.0 m is modelled; the published 1.3 m may be measured from the
  1921 ground, before the court was re-laid. Which one to hold to is an open question for the owner.
- The standing pavilion is white: 8 round white columns on the base, white railings of crossed lattice (open, not solid
  panels), an open inner frame of 4 columns (no walled room), a lower octagonal roof in weathered brown-ochre tile with white
  ridges and slim upturned tips, a lattice band, then a small panelled rectangular upper storey under a hipped roof whose
  straight ridge runs across the axis, with a dragon at each ridge end and a flaming pearl in the middle.
- Front (road side): a wide flight between low cheek walls, clipped hedges in low planters either side along the base.
- Back (river side): a terrace a step up from the ground, a short flight between two white cheek blocks, and a paved
  three-quarter disc about 11 m in radius whose centre is about 19.5 m from the pavilion's, with a ring of darker stone.
- The court lies on the road (NW) side: one pale granite floor (the park's mapped paved square, laid over its footpaths)
  with a darker inlaid panel about 23 × 19 m on the axis and six small dark squares along its sides. The 1921 ponds and
  dragons are not there today and are not modelled.
- The gate: two pairs of white pillars with lotus buds and a pierced panel joining each pair, laid from the satellite base
  blocks (ground level, so no parallax) 44.85 m up the axis: the opening 11.1 m, each pair 4.9 m between centres. Bearings
  from the Street View car panoramas put them about 7 m further in; their camera positions carry that offset, and the
  satellite is used. Heights from the pillars' angular size in those panoramas at the satellite distances: inner about
  7.9 m overall, outer about 5.9 m. A low stone threshold under the gate keeps the park's planted trees out of the
  opening (the one OSM tree mapped there is no longer drawn); real street trees on the verge in front stay.

## Open
- Whether the standing pavilion is the 1921 lầu or the 1936 Bảo Đại pavilion ("Tiểu đình Thương Bạc").
- Base height: 1.0 m above today's court (photo) against the published 1.3 m (see above).
- The dragons and the pearl on the upper ridge are simplified to a few white strokes; their exact figures are not legible
  in the photos.
- The river embankment and the park's paths beyond the court belong to others and were not touched.
