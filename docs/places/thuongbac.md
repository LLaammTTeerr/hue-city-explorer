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
- Platform: the satellite platform is about 12.8 × 14.4 m, smaller than the OSM outline (16.2 × 17.0 m). Base height kept
  at the published 1.3 m, though the photos read nearer 0.9–1.0 m.
- The standing pavilion is white: 8 round white columns on a square base with white pierced railings, an open inner frame
  of 4 columns (no walled room), a lower octagonal roof in weathered brown-red tile with white ridges, a pierced white band,
  a small upper storey and an upper roof with a flaming-pearl finial.
- The court lies on the road (NW) side, not the river side. The 1921 ponds and dragons are not there today and were removed
  from the model; a paved half-disc stands on the river side.
- The gate: two pairs of white pillars with lotus buds and a pierced panel joining each pair, 38 m from the pavilion up the
  axis. Placed by crossing bearings from two Street View panoramas (a third agrees to about 2°); inner pillars about
  9.5 m tall overall, outer about 7.4 m. The satellite pillar feet read about 7 m nearer the road (parallax of slender
  pillars); Street View is used.

## Open
- Whether the standing pavilion is the 1921 lầu or the 1936 Bảo Đại pavilion ("Tiểu đình Thương Bạc").
- The upper roof form (short ridge or flat top) is not clear in the photos; a flat top with a crest is modelled.
- The river embankment and the park's paths belong to others and were not touched.
